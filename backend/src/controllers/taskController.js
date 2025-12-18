const mongoose = require('mongoose');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Module = require('../models/Module');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socketManager = require('../socket');
const { createError: AppError } = require('../utils/error');
const catchAsync = require('../utils/catchAsync');
const { createNotification, createWorkflowNotification } = require('../services/notificationService');
const { handleTaskStatusChange } = require('../services/progressService');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Helper: cập nhật trạng thái tự động cho Sprint, Module, Project
async function updateStatusAfterTaskChange(sprintId) {
  try {
    // Cập nhật trạng thái Sprint - don't populate module initially to avoid validation issues
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return;
    
    // Đảm bảo query tasks sau khi sprint đã được cập nhật với task mới
    const tasks = await Task.find({ sprint: sprint._id });
    console.log('updateStatusAfterTaskChange: found tasks', { 
      sprintId: sprint._id.toString(), 
      taskCount: tasks.length,
      taskIds: tasks.map(t => t.taskId)
    });
    
    // Mapping trạng thái Sprint
    let sprintStatus = 'Chưa bắt đầu';
    
    // Nếu có ít nhất 1 task, chuyển sang trạng thái "Đang thực hiện"
    if (tasks.length > 0) {
      sprintStatus = 'Đang thực hiện';
      
      // Nếu tất cả task đều đã được review "Đạt" thì chuyển sang trạng thái "Hoàn thành"
      if (tasks.every(t => t.reviewStatus === 'Đạt')) {
        sprintStatus = 'Hoàn thành';
      }
    }
    
    console.log('updateStatusAfterTaskChange: updating sprint status', {
      sprintId: sprint._id.toString(),
      oldStatus: sprint.status,
      newStatus: sprintStatus,
      taskCount: tasks.length
    });
    
    sprint.status = sprintStatus;
    await sprint.save();
    
    // Now get module separately if needed
    if (sprint.module) {
      const module = await Module.findById(sprint.module);
      if (module) {
        await module.calculateProgress();
        await module.save();
        // Cập nhật Project
        const project = await Project.findById(module.project);
        if (project) {
          const modules = await Module.find({ project: project._id });
          let projectStatus = 'Khởi tạo';
          if (modules.length > 0) {
            const doneStatuses = ['Hoàn thành', 'Released', 'Maintained', 'Archived'];
            const allDone = modules.every(m => doneStatuses.includes(m.status));
            const hasActive = modules.some(m => !doneStatuses.includes(m.status));
            if (allDone) projectStatus = 'Hoàn thành';
            else if (hasActive) projectStatus = 'Đang thực hiện';
          }
          project.status = projectStatus;
          await project.save();
        }
      }
    }
  } catch (error) {
    console.error('Error in updateStatusAfterTaskChange:', error);
    // Don't throw error to prevent breaking the main operation
  }
}

// Helper: tự động chuyển task từ "Chưa làm" sang "Đang làm" khi đã tới ngày bắt đầu
async function autoStartTaskIfNeeded(task, userForHistory = null) {
  try {
    if (!task) return task;
    if (task.status !== 'Chưa làm') return task;
    if (!task.startDate) return task;

    const now = new Date();
    const start = new Date(task.startDate);
    // Nếu hôm nay đã bằng hoặc sau ngày bắt đầu thì tự chuyển sang Đang làm
    if (!isNaN(start.getTime()) && now >= start) {
      task.status = 'Đang làm';
      task.history = task.history || [];
      task.history.push({
        action: 'tự động cập nhật',
        fromUser: userForHistory?._id || null,
        timestamp: new Date(),
        description: `hệ thống tự động chuyển trạng thái task "${task.name}" từ "Chưa làm" sang "Đang làm" vì đã đến ngày bắt đầu`,
        isPrimary: true
      });
      await task.save();
    }
  } catch (err) {
    console.error('autoStartTaskIfNeeded error:', err);
  }
  return task;
}

// Tạo task mới
exports.createTask = catchAsync(async (req, res, next) => {
  // Debug logs to help trace 500 errors during creation
  console.log('createTask: start', { user: req.user?._id?.toString(), role: req.user?.role, bodyKeys: Object.keys(req.body || {}) });

  // Kiểm tra quyền tạo task theo role (double check sau middleware)
  const allowedRoles = ['PM', 'BA', 'QA Tester', 'Scrum Master', 'Product Owner'];
  if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
    return next(AppError(403, `Role "${req.user?.role || 'Unknown'}" không có quyền tạo task. Chỉ PM, BA, QA Tester, Scrum Master và Product Owner mới có quyền này.`));
  }

  const { 
    taskId, 
    name, 
    goal, 
    taskType, 
    priority, 
    assignees, 
    reviewers, 
    sprint, 
    startDate, 
    taskEndDate, 
    deadline, 
    description, 
    acceptanceCriteria, 
    storyPoints, 
    estimatedHours 
  } = req.body;
  
  // Validate required fields
  if (!taskId || !name || !assignees || !reviewers || !sprint) {
    return next(AppError(400, 'Thiếu thông tin bắt buộc: taskId, name, assignees, reviewers, sprint'));
  }

  // Validate that assignees and reviewers are non-empty arrays
  if (!Array.isArray(assignees) || assignees.length === 0) {
    return next(AppError(400, 'Phải có ít nhất một người thực hiện (assignees)'));
  }
  if (!Array.isArray(reviewers) || reviewers.length === 0) {
    return next(AppError(400, 'Phải có ít nhất một người đánh giá (reviewers)'));
  }
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sprint)) {
    return next(AppError(400, 'Sprint ID không hợp lệ'));
  }
  
  // Validate assignees array
  const assigneeIds = Array.isArray(assignees) ? assignees : [assignees];
  for (const assigneeId of assigneeIds) {
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      return next(AppError(400, 'Assignee ID không hợp lệ'));
    }
  }
  
  // Validate reviewers array
  const reviewerIds = Array.isArray(reviewers) ? reviewers : [reviewers];
  for (const reviewerId of reviewerIds) {
    if (!mongoose.Types.ObjectId.isValid(reviewerId)) {
      return next(AppError(400, 'Reviewer ID không hợp lệ'));
    }
  }

  // Validate assignee and reviewer roles
  const assigneeUsers = await User.find({ _id: { $in: assigneeIds } });
  const reviewerUsers = await User.find({ _id: { $in: reviewerIds } });

  // Check if all assignees exist
  if (assigneeUsers.length !== assigneeIds.length) {
    return next(AppError(400, 'Một hoặc nhiều người thực hiện không tồn tại'));
  }

  // Check if all reviewers exist
  if (reviewerUsers.length !== reviewerIds.length) {
    return next(AppError(400, 'Một hoặc nhiều người đánh giá không tồn tại'));
  }

  // Validate assignee roles (should be able to perform tasks)
  const validAssigneeRoles = ['Developer', 'QA Tester', 'DevOps Engineer'];
  const invalidAssignees = assigneeUsers.filter(user => !validAssigneeRoles.includes(user.role));
  if (invalidAssignees.length > 0) {
    const invalidNames = invalidAssignees.map(u => `${u.name} (${u.role})`).join(', ');
    return next(AppError(400, `Người thực hiện phải có vai trò: ${validAssigneeRoles.join(', ')}. Người dùng không hợp lệ: ${invalidNames}`));
  }

  // Validate reviewer roles (should be able to review tasks)
  const validReviewerRoles = ['BA', 'PM', 'Scrum Master', 'Product Owner'];
  const invalidReviewers = reviewerUsers.filter(user => !validReviewerRoles.includes(user.role));
  if (invalidReviewers.length > 0) {
    const invalidNames = invalidReviewers.map(u => `${u.name} (${u.role})`).join(', ');
    return next(AppError(400, `Người đánh giá phải có vai trò: ${validReviewerRoles.join(', ')}. Người dùng không hợp lệ: ${invalidNames}`));
  }

  // Không cho phép một user vừa là assignee vừa là reviewer trong cùng một task
  const overlappingIds = assigneeIds.filter(id => reviewerIds.map(r => r.toString()).includes(id.toString()));
  if (overlappingIds.length > 0) {
    const overlappingUsers = await User.find({ _id: { $in: overlappingIds } }).select('name role');
    const overlappingNames = overlappingUsers.map(u => `${u.name} (${u.role})`).join(', ');
    return next(AppError(400, `Một người không thể vừa là người thực hiện (assignee) vừa là người đánh giá (reviewer): ${overlappingNames}`));
  }
  
  const sprintDoc = await Sprint.findById(sprint).populate({
    path: 'module',
    populate: {
      path: 'project'
    }
  });
  if (!sprintDoc) return next(AppError(404, 'Sprint not found'));
  console.log('createTask: found sprintDoc', { sprintId: sprintDoc._id.toString() });
  if (!sprintDoc.module || !sprintDoc.module.project) {
    return next(AppError(400, 'Sprint không có thông tin module/project hợp lệ'));
  }

  // Handle docs upload (Cloudinary)
  let docs = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      docs.push({
        url: file.path,
        publicId: file.filename,
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      });
    }
  }

  // Xử lý dates - chỉ set nếu có giá trị hợp lệ
  let processedStartDate = null;
  let processedEndDate = null;
  
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      processedStartDate = start;
    }
  }
  
  if (taskEndDate) {
    const end = new Date(taskEndDate);
    if (!isNaN(end.getTime())) {
      processedEndDate = end;
    }
  }
  
  const task = new Task({
    taskId: taskId.trim(),
    name: name.trim(),
    goal: goal ? goal.trim() : '',
    taskType: taskType || 'Feature',
    priority: priority || 'Trung bình',
    createdBy: req.user._id,
    assignees: assigneeIds,
    reviewers: reviewerIds,
    sprint: sprintDoc._id,
    project: sprintDoc.module.project._id,
    status: 'Chưa làm',
    reviewStatus: 'Chưa',
    startDate: processedStartDate,
    endDate: processedEndDate,
    deadline: deadline ? new Date(deadline) : null,
    description: description ? description.trim() : '',
    acceptanceCriteria: acceptanceCriteria || [],
    storyPoints: storyPoints || 0,
    estimatedHours: estimatedHours || 0,
    docs,
    history: [{
      action: 'tạo task',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã tạo task "${name.trim()}"`,
      isPrimary: false
    }],
  });
  try {
    await task.save();
    console.log('createTask: task saved', { taskId: task._id.toString() });
  } catch (err) {
    console.error('createTask: failed to save task', err);
    // Duplicate taskId
    if (err.code === 11000) {
      return next(AppError(400, 'Task ID đã tồn tại. Vui lòng thử taskId khác.'));
    }
    return next(err);
  }
  sprintDoc.tasks.push(task._id);

  // Thêm lịch sử tạo task vào sprint
  sprintDoc.history.push({
    action: 'tạo task',
    task: task._id,
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã tạo task "${task.name}" trong sprint "${sprintDoc.name}"`,
    isPrimary: true
  });
  await sprintDoc.save();
  console.log('createTask: sprintDoc saved after push', { sprintId: sprintDoc._id.toString() });
  
  // Đảm bảo task đã được lưu vào database trước khi cập nhật status
  await new Promise(resolve => setTimeout(resolve, 100));
  await updateStatusAfterTaskChange(sprintDoc._id);

  // Phát sự kiện tạo mới task kèm thông tin sprint đã cập nhật
  const updatedSprint = await Sprint.findById(sprintDoc._id)
    .populate('tasks', 'taskId name status reviewStatus')
    .populate('history', 'action description timestamp')
    .populate('history.fromUser', 'name email');
    
  socketManager.broadcastToSprintRoom(sprintDoc._id.toString(), 'taskAdded', {
    sprintId: sprintDoc._id.toString(),
    newTask: task.toObject(),
    updatedSprint: updatedSprint ? updatedSprint.toObject() : null // Gửi kèm thông tin sprint đã cập nhật (guard null)
  });

  // Lấy thông tin cần thiết cho notification
  let populatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email')
    .populate('reviewers', 'name email');
  console.log('createTask: populatedTask loaded', { populatedAssignees: !!populatedTask.assignees, populatedReviewers: !!populatedTask.reviewers });

  const sprintWithModule = await Sprint.findById(sprintDoc._id)
    .populate({
      path: 'module',
      populate: {
        path: 'project',
        select: 'name projectManager'
      }
    });

  const projectName = sprintWithModule.module?.project?.name || 'Không xác định';
  const moduleName = sprintWithModule.module?.name || 'Không xác định';
  const formattedEndDate = task.endDate ? new Date(task.endDate).toLocaleDateString('vi-VN') : (sprintWithModule.endDate ? new Date(sprintWithModule.endDate).toLocaleDateString('vi-VN') : 'Chưa có hạn chót');
  const projectManagerId = sprintWithModule.module?.project?.projectManager?.toString() || null;

  // Gửi notification cho project manager
  if (projectManagerId) {
    try {
      await require('../services/notificationService').createWorkflowNotification(
        'task_created',
        { 
          taskName: task.name,
          sprintName: sprintDoc.name,
          projectName: projectName,
          storyPoints: task.storyPoints || 0,
          refId: task._id.toString()
        },
        { 
          projectManagerId: projectManagerId
        }
      );
      console.log('createTask: sent notification to project manager:', projectManagerId);
    } catch (err) {
      console.error('createTask: failed to create project manager notification', err);
    }
  }

  // Notification cho assignees
  if (populatedTask.assignees && populatedTask.assignees.length > 0) {
    for (const assignee of populatedTask.assignees) {
      try {
        await createWorkflowNotification('task_assigned', {
          taskName: task.name,
          taskId: task.taskId,
          assignerName: req.user.name,
          sprintName: sprintWithModule.name,
          projectName: projectName,
          refId: task._id.toString()
        }, {
          assigneeId: assignee._id
        });
      } catch (err) {
        console.error('createTask: failed to create assignee notification', err);
      }
    }
  }

  // Notification cho reviewers
  if (populatedTask.reviewers && populatedTask.reviewers.length > 0) {
    for (const reviewer of populatedTask.reviewers) {
      try {
        await createWorkflowNotification('task_review_assigned', {
          taskName: task.name,
          taskId: task.taskId,
          sprintName: sprintWithModule.name,
          projectName: projectName,
          refId: task._id.toString()
        }, {
          reviewerId: reviewer._id
        });
      } catch (err) {
        console.error('createTask: failed to create reviewer notification', err);
      }
    }
  }

  // Populate task đầy đủ trước khi trả về để frontend có đầy đủ thông tin
  populatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email')
    .populate('reviewers', 'name email')
    .populate('createdBy', 'name email')
    .populate('sprint', 'name')
    .populate('project', 'name');
  
  console.log('createTask: completed successfully, returning 201', { taskId: task._id.toString() });
  res.status(201).json(populatedTask);
});

// Lấy danh sách task theo sprint
exports.getTasksBySprint = catchAsync(async (req, res, next) => {
  const { sprintId } = req.params;
  let tasks = await Task.find({ sprint: sprintId })
    .populate('assignees', 'name email')
    .populate('reviewers', 'name email')
    .populate('createdBy', 'name email');

  // Tự động chuyển các task đã tới ngày bắt đầu sang Đang làm
  const updatedTasks = [];
  for (const t of tasks) {
    const updated = await autoStartTaskIfNeeded(t, req.user);
    updatedTasks.push(updated);
  }

  res.json(updatedTasks);
});

// Lấy chi tiết task
exports.getTask = catchAsync(async (req, res, next) => {
  let task = await Task.findById(req.params.id)
    .populate('assignees', 'name email avatar')
    .populate('reviewers', 'name email avatar')
    .populate('sprint', 'name'); // Thêm populate cho sprint
  if (!task) return next(AppError(404, 'Task not found'));

  // Tự động chuyển sang Đang làm nếu đã tới ngày bắt đầu
  task = await autoStartTaskIfNeeded(task, req.user);

  res.json(task);
});

// Cập nhật task
exports.updateTask = catchAsync(async (req, res, next) => {
  const { name, goal, assignees, reviewers, priority, estimatedHours, keepFiles, businessWorkflow, startDate, endDate, handoverComment, fromUser } = req.body;
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  const oldValue = {
    name: task.name,
    goal: task.goal,
    assignees: task.assignees,
    reviewers: task.reviewers,
    priority: task.priority,
    estimatedHours: task.estimatedHours
  };

  // Validate assignees array if provided
  let validatedAssignees = task.assignees;
  if (assignees !== undefined) {
    if (!Array.isArray(assignees)) {
      return next(AppError(400, 'Assignees phải là một mảng'));
    }
    if (assignees.length === 0) {
      return next(AppError(400, 'Phải có ít nhất một người thực hiện'));
    }
    // Validate ObjectId format
    for (const assigneeId of assignees) {
      if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
        return next(AppError(400, 'Assignee ID không hợp lệ'));
      }
    }
    validatedAssignees = assignees;
  }

  // Validate reviewers array if provided
  let validatedReviewers = task.reviewers;
  if (reviewers !== undefined) {
    if (!Array.isArray(reviewers)) {
      return next(AppError(400, 'Reviewers phải là một mảng'));
    }
    if (reviewers.length === 0) {
      return next(AppError(400, 'Phải có ít nhất một người đánh giá'));
    }
    // Validate ObjectId format
    for (const reviewerId of reviewers) {
      if (!mongoose.Types.ObjectId.isValid(reviewerId)) {
        return next(AppError(400, 'Reviewer ID không hợp lệ'));
      }
    }
    validatedReviewers = reviewers;
  }

  // Validate assignee and reviewer roles if they are being updated
  if (assignees !== undefined || reviewers !== undefined) {
    const assigneesToValidate = assignees !== undefined ? validatedAssignees : task.assignees;
    const reviewersToValidate = reviewers !== undefined ? validatedReviewers : task.reviewers;

    const assigneeUsers = assigneesToValidate && assigneesToValidate.length > 0
      ? await User.find({ _id: { $in: assigneesToValidate } })
      : [];
    const reviewerUsers = reviewersToValidate && reviewersToValidate.length > 0
      ? await User.find({ _id: { $in: reviewersToValidate } })
      : [];

    // Check if all assignees exist
    if (assigneesToValidate && assigneesToValidate.length > 0 && assigneeUsers.length !== assigneesToValidate.length) {
      return next(AppError(400, 'Một hoặc nhiều người thực hiện không tồn tại'));
    }

    // Check if all reviewers exist
    if (reviewersToValidate && reviewersToValidate.length > 0 && reviewerUsers.length !== reviewersToValidate.length) {
      return next(AppError(400, 'Một hoặc nhiều người đánh giá không tồn tại'));
    }

    // Validate assignee roles (should be able to perform tasks)
    if (assigneeUsers.length > 0) {
      const validAssigneeRoles = ['Developer', 'QA Tester', 'DevOps Engineer'];
      const invalidAssignees = assigneeUsers.filter(user => !validAssigneeRoles.includes(user.role));
      if (invalidAssignees.length > 0) {
        const invalidNames = invalidAssignees.map(u => `${u.name} (${u.role})`).join(', ');
        return next(AppError(400, `Người thực hiện phải có vai trò: ${validAssigneeRoles.join(', ')}. Người dùng không hợp lệ: ${invalidNames}`));
      }
    }

    // Validate reviewer roles (should be able to review tasks)
    if (reviewerUsers.length > 0) {
      const validReviewerRoles = ['BA', 'PM', 'Scrum Master', 'Product Owner'];
      const invalidReviewers = reviewerUsers.filter(user => !validReviewerRoles.includes(user.role));
      if (invalidReviewers.length > 0) {
        const invalidNames = invalidReviewers.map(u => `${u.name} (${u.role})`).join(', ');
        return next(AppError(400, `Người đánh giá phải có vai trò: ${validReviewerRoles.join(', ')}. Người dùng không hợp lệ: ${invalidNames}`));
      }
    }

    // Không cho phép một user vừa là assignee vừa là reviewer khi cập nhật task
    const overlappingIds = (assigneesToValidate || []).filter(id => (reviewersToValidate || []).map(r => r.toString()).includes(id.toString()));
    if (overlappingIds.length > 0) {
      const overlappingUsers = await User.find({ _id: { $in: overlappingIds } }).select('name role');
      const overlappingNames = overlappingUsers.map(u => `${u.name} (${u.role})`).join(', ');
      return next(AppError(400, `Một người không thể vừa là người thực hiện (assignee) vừa là người đánh giá (reviewer): ${overlappingNames}`));
    }
  }

  // Check if this is a handover operation (compare arrays)
  const isHandover = (assignees && JSON.stringify(assignees.sort()) !== JSON.stringify((task.assignees || []).map(a => a.toString()).sort())) ||
                    (reviewers && JSON.stringify(reviewers.sort()) !== JSON.stringify((task.reviewers || []).map(r => r.toString()).sort()));

  // Store original assignees/reviewers for notification
  const originalAssignees = task.assignees;
  const originalReviewers = task.reviewers;

  // Xử lý keepFiles only if it is provided
  if (keepFiles !== undefined) {
    let keepPublicIds = [];
    if (typeof keepFiles === 'string') {
      try { keepPublicIds = JSON.parse(keepFiles); } catch {}
    } else if (Array.isArray(keepFiles)) {
      keepPublicIds = keepFiles;
    }
    // Xóa file cũ không còn giữ
    if (task.docs && task.docs.length > 0) {
      const toDelete = task.docs.filter(f => !keepPublicIds.includes(f.publicId));
      for (const doc of toDelete) {
        if (doc.publicId) {
          try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
        }
        // Thêm lịch sử xóa file
        task.history.push({
          action: 'xóa file',
          fromUser: req.user._id,
          timestamp: new Date(),
          description: `đã xóa file "${doc.fileName}" khỏi task "${task.name}"`,
          isPrimary: true
        });
      }
      task.docs = task.docs.filter(f => keepPublicIds.includes(f.publicId));
    }
  }

  // Thêm file mới
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      task.docs.push({
        url: file.path,
        publicId: file.filename,
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      });
      // Thêm lịch sử thêm file
      task.history.push({
        action: 'thêm file',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã thêm file "${file.originalname}" vào task "${task.name}"`,
        isPrimary: true
      });
    }
  }

  if (name) task.name = name;
  if (goal) task.goal = goal;
  if (assignees !== undefined) task.assignees = validatedAssignees;
  if (reviewers !== undefined) task.reviewers = validatedReviewers;
  if (priority && ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'].includes(priority)) {
    task.priority = priority;
  }
  if (estimatedHours !== undefined && estimatedHours >= 0) {
    task.estimatedHours = estimatedHours;
  }
  if (businessWorkflow !== undefined) {
    task.businessWorkflow = businessWorkflow;
  }
  if (startDate !== undefined) {
    task.startDate = startDate;
  }
  if (endDate !== undefined) {
    task.endDate = endDate;
  }

  // Add handover history if this is a handover operation
  if (isHandover) {
    const originalAssigneeNames = (originalAssignees || []).map(a => a.name || 'chưa có').join(', ');
    const newAssigneeNames = (validatedAssignees || []).map(a => a.name || 'chưa có').join(', ');
    const originalReviewerNames = (originalReviewers || []).map(r => r.name || 'chưa có').join(', ');
    const newReviewerNames = (validatedReviewers || []).map(r => r.name || 'chưa có').join(', ');

    task.history.push({
      action: 'handover',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã bàn giao task "${task.name}" từ assignees: ${originalAssigneeNames}, reviewers: ${originalReviewerNames} sang assignees: ${newAssigneeNames}, reviewers: ${newReviewerNames}`,
      isPrimary: true,
      task: task._id
    });

    // Send handover notifications
    const handoverNotificationService = require('../services/handoverNotificationService');
    const User = require('../models/User');

    try {
      // Get user details for new assignees and reviewers
      const newAssigneeUsers = validatedAssignees && validatedAssignees.length > 0
        ? await User.find({ _id: { $in: validatedAssignees } })
        : [];
      const newReviewerUsers = validatedReviewers && validatedReviewers.length > 0
        ? await User.find({ _id: { $in: validatedReviewers } })
        : [];

      // Send handover initiated notification for each new assignee/reviewer
      for (const newAssignee of newAssigneeUsers) {
        await handoverNotificationService.sendHandoverInitiatedNotification(
          task,
          req.user,
          newAssignee,
          null // reviewer is handled separately if needed
        );
      }

      for (const newReviewer of newReviewerUsers) {
        await handoverNotificationService.sendHandoverInitiatedNotification(
          task,
          req.user,
          null, // assignee is handled separately
          newReviewer
        );
      }
    } catch (notificationError) {
      console.error('Error sending handover notifications:', notificationError);
    }
  } else {
    // Check if assignees changed (not handover, but assignment)
    if (assignees && JSON.stringify(assignees.sort()) !== JSON.stringify((task.assignees || []).map(a => a.toString()).sort())) {
      // Send task assignment notifications for new assignees
      const { createWorkflowNotification } = require('../services/notificationService');
      const User = require('../models/User');

      try {
        const newAssigneeUsers = await User.find({ _id: { $in: assignees } });
        for (const newAssigneeUser of newAssigneeUsers) {
          await createWorkflowNotification('task_assigned', {
            taskName: task.name,
            taskId: task.taskId,
            assignerName: req.user.name
          }, {
            assigneeId: newAssigneeUser._id
          });
        }
      } catch (notificationError) {
        console.error('Error sending task assignment notifications:', notificationError);
      }
    }

    // Check if reviewers changed
    if (reviewers && JSON.stringify(reviewers.sort()) !== JSON.stringify((task.reviewers || []).map(r => r.toString()).sort())) {
      // Send task review assignment notifications for new reviewers
      const { createWorkflowNotification } = require('../services/notificationService');
      const User = require('../models/User');

      try {
        const newReviewerUsers = await User.find({ _id: { $in: reviewers } });
        for (const newReviewerUser of newReviewerUsers) {
          await createWorkflowNotification('task_review_assigned', {
            taskName: task.name,
            taskId: task.taskId
          }, {
            reviewerId: newReviewerUser._id
          });
        }
      } catch (notificationError) {
        console.error('Error sending task review assignment notifications:', notificationError);
      }
    }

    // Regular update history
    task.history.push({
      action: 'cập nhật thông tin task',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã cập nhật thông tin task "${task.name}"`,
      isPrimary: true
    });
  }
  await task.save();
  res.json(task);
});

// Xóa task
exports.deleteTask = catchAsync(async (req, res, next) => {
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask', đảm bảo tính nhất quán
  if (!task) return next(AppError(404, 'Task not found'));

  // Chỉ PM và BA mới có quyền xóa task
  // Authorization for deletion is handled by route-level permission middleware
  // (removed inline role check to avoid duplication and mismatches)

  // --- Logic gửi thông báo ---
  // Lấy thông tin người thực hiện và người review trước khi xóa
  const assignees = task.assignees || [];
  const reviewers = task.reviewers || [];
  const taskName = task.name;
  const deletedBy = req.user.name; // Lấy tên người xóa từ token

  const notificationMessage = `Task "${taskName}" đã bị xóa bởi ${deletedBy}.`;

  // Gửi thông báo cho người thực hiện (nếu có)
  try {
    for (const assignee of assignees) {
      if (assignee && assignee.toString() !== req.user._id.toString()) {
        await createNotification(assignee, notificationMessage, 'task_deleted', task._id.toString());
      }
    }
  } catch (notifError) {
    console.error('Error creating assignee notification on task delete:', notifError);
  }

  // Gửi thông báo cho người review (nếu có)
  try {
    for (const reviewer of reviewers) {
      if (reviewer && reviewer.toString() !== req.user._id.toString()) {
        await createNotification(reviewer, notificationMessage, 'task_deleted', task._id.toString());
      }
    }
  } catch (notifError) {
    console.error('Error creating reviewer notification on task delete:', notifError);
  }
  // --- Kết thúc logic thông báo ---

  const sprint = await Sprint.findById(task.sprint);
  if (sprint) {
    try {
      // Remove task from sprint's tasks array
      sprint.tasks = sprint.tasks.filter(tid => tid.toString() !== task._id.toString());
      
      // Only add history if sprint has module field
      if (sprint.module) {
        sprint.history.push({
          action: 'xóa task',
          task: null,
          fromUser: req.user._id,
          timestamp: new Date(),
          description: `đã xóa task "${task.name}" khỏi sprint "${sprint.name}"`
        });
      }
      
      await sprint.save();
      console.log('Task removed from sprint successfully');
    } catch (sprintError) {
      console.error('Error updating sprint on task delete:', sprintError);
      // Continue with task deletion even if sprint update fails
    }
  }
  await task.deleteOne();
  await updateStatusAfterTaskChange(task.sprint);
  res.json({ message: 'Task deleted successfully' });
});

// Cập nhật trạng thái task
exports.updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status, businessWorkflow, startDate, endDate } = req.body;
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  // Kiểm tra quyền cập nhật: chỉ assignee (Developer), reviewer, PM, BA mới có quyền
  const isAssignee = task.assignees && task.assignees.some(assignee => assignee.toString() === req.user._id.toString());
  const isReviewer = task.reviewers && task.reviewers.some(reviewer => reviewer.toString() === req.user._id.toString());
  const isPM = req.user.role === 'PM'; // Lấy từ token đã được sửa
  const isBA = req.user.role === 'BA'; // Lấy từ token đã được sửa

  if (!isAssignee && !isReviewer && !isPM && !isBA) {
    return next(AppError(403, 'Bạn không có quyền cập nhật trạng thái task này.'));
  }
  const oldStatus = task.status;
  const validStatuses = ['Hàng đợi', 'Chưa làm', 'Đang làm', 'Đang xem xét', 'Kiểm thử QA', 'Sẵn sàng phát hành', 'Hoàn thành', 'Mới', 'Đang xác nhận', 'Đang sửa', 'Kiểm thử lại', 'Đã đóng'];
  if (status && validStatuses.includes(status)) {
    task.status = status;

    // Update businessWorkflow if provided
    if (businessWorkflow !== undefined) {
      task.businessWorkflow = businessWorkflow;
    }
    if (startDate !== undefined) {
      task.startDate = startDate;
    }
    if (endDate !== undefined) {
      task.endDate = endDate;
    }

    // Xử lý logic khi developer nhấn nút "hoàn thành"
    if (status === 'Hoàn thành' && task.status === 'Đang làm') {
      // Kiểm tra xem có completion files không
      if (!task.completionFiles || task.completionFiles.length === 0) {
        return next(AppError(400, 'Vui lòng upload file hoàn thành (work files hoặc PDF review) trước khi đánh dấu task là hoàn thành.'));
      }
      // Thay đổi status thành 'Đang xem xét' thay vì 'Hoàn thành'
      status = 'Đang xem xét';
      task.status = 'Đang xem xét';
      task.reviewStatus = 'Chưa';
    } else if (status === 'Hoàn thành') {
      // Trường hợp khác khi set thành 'Hoàn thành' (từ reviewer)
      task.reviewStatus = 'Chưa';
    }

    // Gọi dịch vụ tiến độ
    await handleTaskStatusChange(task._id, status, req.user._id);

    task.history.push({
      action: 'cập nhật trạng thái',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã cập nhật trạng thái của task "${task.name}" từ "${oldStatus}" thành "${status}"`,
      isPrimary: false
    });
    await task.save();

    // Thêm lịch sử vào sprint cha
    const sprint = await Sprint.findById(task.sprint);
    if (sprint) {
      sprint.history.push({
        action: 'cập nhật trạng thái',
        task: task._id,
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã cập nhật trạng thái của task "${task.name}" trong sprint "${sprint.name}" từ "${oldStatus}" thành "${status}"`,
        isPrimary: true
      });
      await sprint.save();
    }
    
    // Lấy lại thông tin task mới nhất sau khi đã cập nhật và populate thông tin cần thiết
    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('reviewers', 'name email avatar');
      
    if (updatedTask) {
      // Phát sự kiện cập nhật task
      socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
        sprintId: updatedTask.sprint.toString(),
        updatedTask: updatedTask.toObject()
      });
    }

    await updateStatusAfterTaskChange(task.sprint);

    // Notification cho reviewer nếu task chuyển sang "Đang xem xét" (developer nhấn hoàn thành)
    if (status === 'Đang xem xét' && oldStatus === 'Đang làm') {
      // Lấy thông tin module và project cho thông báo
      const sprintDoc = await Sprint.findById(task.sprint)
        .populate({
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        });
      let moduleName = '';
      let projectName = '';
      if (
        sprintDoc &&
        sprintDoc.module &&
        sprintDoc.module.project
      ) {
        moduleName = sprintDoc.module.name;
        projectName = sprintDoc.module.project.name;
      }
      const populatedTask = await Task.findById(task._id)
        .populate('reviewers', 'name email')
        .populate('assignees', 'name email');

      // Thông báo cho reviewers
      if (populatedTask.reviewers && populatedTask.reviewers.length > 0) {
        for (const reviewer of populatedTask.reviewers) {
          const reviewerMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được ${populatedTask.assignees?.[0]?.name || 'người thực hiện'} hoàn thành và đang chờ đánh giá. Vui lòng xem file và đưa ra nhận xét.`;

          const notification = await Notification.create({
            user: reviewer._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: reviewerMessage
          });
          try { socketManager.sendNotification(reviewer._id, notification); } catch (err) { console.error('sendNotification reviewer error', err); }
        }
      }

      // Thông báo cho PM về task đang chờ review
      const pms = await User.find({ role: 'PM' });
      const pmMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được ${populatedTask.assignees?.[0]?.name || 'người thực hiện'} hoàn thành và đang chờ đánh giá từ ${populatedTask.reviewers?.map(r => r.name).join(', ') || 'người đánh giá'}.`;

      for (const pm of pms) {
        try {
          const notification = await Notification.create({
            user: pm._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: pmMessage
          });
          try { socketManager.sendNotification(pm._id, notification); } catch (err) { console.error('sendNotification pm error', err); }
        } catch (err) {
          console.error('createTask: failed to create pm notification', err);
        }
      }

      // Thông báo cho BA về task đang chờ review
      const bas = await User.find({ role: 'BA' });
      const baMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã hoàn thành và đang chờ đánh giá. Vui lòng kiểm tra chất lượng công việc nếu cần thiết.`;

      for (const ba of bas) {
        try {
          const notification = await Notification.create({
            user: ba._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: baMessage
          });
          try { socketManager.sendNotification(ba._id, notification); } catch (err) { console.error('sendNotification ba error', err); }
        } catch (err) {
          console.error('createTask: failed to create ba notification', err);
        }
      }
    }

    // Notification cho reviewer nếu task Hoàn thành
    if (status === 'Hoàn thành') {
      // Lấy thông tin module và project cho thông báo
      const sprintDoc = await Sprint.findById(task.sprint)
        .populate({
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        });
      let moduleName = '';
      let projectName = '';
      if (
        sprintDoc &&
        sprintDoc.module &&
        sprintDoc.module.project
      ) {
        moduleName = sprintDoc.module.name;
        projectName = sprintDoc.module.project.name;
      }
      const populatedTask = await Task.findById(task._id)
        .populate('reviewers', 'name email')
        .populate('assignees', 'name email');

      // Thông báo cho reviewer
      if (populatedTask.reviewer) {
        try {
          const reviewerMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã thực hiện xong. Vui lòng nhận xét, đánh giá kết quả.`;
          const notification = await Notification.create({
            user: populatedTask.reviewer._id,
            type: 'task_completed',
            refId: task._id.toString(),
            message: reviewerMessage
          });
          try { socketManager.sendNotification(populatedTask.reviewer._id, notification); } catch (err) { console.error('sendNotification reviewer error', err); }
        } catch (err) {
          console.error('createTask: failed to create reviewer notification', err);
        }
      }

      // Thông báo cho PM về task hoàn thành
      const pms = await User.find({ role: 'PM' });
      const pmMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được ${populatedTask.assignee?.name || 'Một người'} hoàn thành. Đang chờ đánh giá từ ${populatedTask.reviewer?.name || 'Một người'}.`;

      for (const pm of pms) {
        try {
          const notification = await Notification.create({
            user: pm._id,
            type: 'task_completed',
            refId: task._id.toString(),
            message: pmMessage
          });
          try { socketManager.sendNotification(pm._id, notification); } catch (err) { console.error('sendNotification pm error', err); }
        } catch (err) {
          console.error('createTask: failed to create pm notification', err);
        }
      }

      // Thông báo cho BA về task hoàn thành - BA cần review completion files
      const bas = await User.find({ role: 'BA' });
      const baMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã hoàn thành với file review. Vui lòng kiểm tra và đánh giá chất lượng công việc.`;

      for (const ba of bas) {
        try {
          const notification = await Notification.create({
            user: ba._id,
            type: 'task_completed_for_ba_review',
            refId: task._id.toString(),
            message: baMessage
          });
          try { socketManager.sendNotification(ba._id, notification); } catch (err) { console.error('sendNotification ba error', err); }
        } catch (err) {
          console.error('createTask: failed to create ba notification', err);
        }
      }
    }

    // Phát socket event cho tất cả client cùng sprint
    const io = socketManager.getIO ? socketManager.getIO() : socketManager.io;
    if (io) {
      io.to(task.sprint.toString()).emit('taskUpdated', {
        sprintId: task.sprint.toString(),
        updatedTask: task
      });
    }
    res.json(task);
  } else {
    return next(AppError(400, 'Trạng thái không hợp lệ'));
  }
});

// Cập nhật reviewStatus task
exports.updateTaskReviewStatus = catchAsync(async (req, res, next) => {
  const { reviewStatus, comment } = req.body;
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  // Lấy thông tin module và project cho thông báo
  const sprintDoc = await Sprint.findById(task.sprint)
    .populate({
      path: 'module',
      populate: {
        path: 'project',
        select: 'name'
      }
    });
  let moduleName = '';
  let projectName = '';
  if (sprintDoc && sprintDoc.module && sprintDoc.module.project) {
    moduleName = sprintDoc.module.name;
    projectName = sprintDoc.module.project.name;
  }

  if (reviewStatus && ['Chưa', 'Đạt', 'Không đạt'].includes(reviewStatus)) {
    task.reviewStatus = reviewStatus;

    const desc = comment && comment.trim()
      ? `đã cập nhật đánh giá cho task "${task.name}" thành "${reviewStatus}". Nhận xét: ${comment.trim()}`
      : `đã cập nhật đánh giá cho task "${task.name}" thành "${reviewStatus}"`;

    task.history.push({
      action: 'cập nhật đánh giá',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: desc,
      isPrimary: false
    });

    if (reviewStatus === 'Đạt') {
      task.status = 'Hoàn thành';
      // Gọi dịch vụ tiến độ cho trạng thái mới
      await handleTaskStatusChange(task._id, 'Hoàn thành', req.user._id);
    } else if (reviewStatus === 'Không đạt') {
      task.status = 'Đang sửa';
      // Gọi dịch vụ tiến độ cho trạng thái mới
      await handleTaskStatusChange(task._id, 'Đang sửa', req.user._id);
    }

    await task.save();

    // Thêm lịch sử vào sprint cha
    const sprint = await Sprint.findById(task.sprint);
    if (sprint) {
      const sprintDesc = comment && comment.trim()
        ? `đã cập nhật đánh giá cho task "${task.name}" trong sprint "${sprint.name}" thành "${reviewStatus}". Nhận xét: ${comment.trim()}`
        : `đã cập nhật đánh giá cho task "${task.name}" trong sprint "${sprint.name}" thành "${reviewStatus}"`;
      sprint.history.push({
        action: 'cập nhật đánh giá',
        task: task._id,
        fromUser: req.user._id,
        timestamp: new Date(),
        description: sprintDesc,
        isPrimary: true
      });
      await sprint.save();
    }

    // Gửi notification cho assignees về kết quả review
    if (task.assignees && task.assignees.length > 0) {
      for (const assignee of task.assignees) {
        try {
          const assigneeMessage = comment && comment.trim()
            ? `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được đánh giá "${reviewStatus}". Nhận xét: ${comment.trim()}`
            : `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được đánh giá "${reviewStatus}".`;

          const notification = await Notification.create({
            user: assignee._id || assignee,
            type: 'task_reviewed',
            refId: task._id.toString(),
            message: assigneeMessage
          });

          try { socketManager.sendNotification(assignee._id || assignee, notification); } catch (err) { console.error('sendNotification assignee on review error', err); }
        } catch (err) {
          console.error('updateTaskReviewStatus: failed to create task_reviewed notification', err);
        }
      }
    }

    // Cập nhật lại trạng thái Sprint/Module/Project sau khi review thay đổi
    await updateStatusAfterTaskChange(task.sprint);

    // Lấy lại thông tin task mới nhất sau khi đã cập nhật và populate thông tin cần thiết
    const updatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('reviewers', 'name email avatar');

    if (updatedTask) {
      // Sử dụng broadcastToSprintRoom để gửi sự kiện cập nhật task
      socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
        sprintId: updatedTask.sprint.toString(),
        updatedTask: updatedTask.toObject()
      });
    }

    return res.json(updatedTask);
  } else {
    return next(AppError(400, 'Trạng thái review không hợp lệ'));
  }
});

// API: Lấy moduleId và sprintId từ taskId để phục vụ điều hướng notification
exports.getTaskNavigationInfo = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const sprint = await Sprint.findById(task.sprint);
  if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
  return res.json({
    moduleId: sprint.module,
    sprintId: sprint._id
  });
});

// Log time cho task
exports.logTime = catchAsync(async (req, res, next) => {
  const { hours, description } = req.body;
  const task = await Task.findById(req.params.id);

  if (!task) return next(AppError(404, 'Task not found'));
  if (!hours || hours <= 0) return next(AppError(400, 'Số giờ phải lớn hơn 0'));

  // Thêm time log
  task.timeLogs.push({
    date: new Date(),
    hours: hours,
    description: description || '',
    loggedBy: req.user._id
  });

  // Cập nhật actual hours
  task.actualHours += hours;

  task.history.push({
    action: 'log time',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã log ${hours} giờ cho task "${task.name}"`,
    isPrimary: false
  });

  await task.save();
  res.json(task);
});

// Lấy time logs của task
exports.getTimeLogs = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('timeLogs.loggedBy', 'name email');

  if (!task) return next(AppError(404, 'Task not found'));

  res.json(task.timeLogs);
});

// Cập nhật PO Acceptance
exports.updatePOAcceptance = catchAsync(async (req, res, next) => {
  const { accepted } = req.body;
  const task = req.task;

  if (!task) return next(AppError(404, 'Task not found'));

  // Chỉ Product Owner mới có quyền cập nhật PO acceptance
  if (req.user.role !== 'Product Owner') {
    return next(AppError(403, 'Chỉ Product Owner mới có quyền cập nhật chấp nhận cuối cùng.'));
  }

  // Chỉ cho phép cập nhật khi task đã hoàn thành
  if (task.status !== 'Hoàn thành') {
    return next(AppError(400, 'Chỉ có thể cập nhật chấp nhận PO khi task đã hoàn thành.'));
  }

  // Cập nhật business workflow
  task.businessWorkflow = task.businessWorkflow || {};
  task.businessWorkflow.poAcceptFeature = accepted;

  // Thêm lịch sử
  task.history.push({
    action: 'cập nhật PO acceptance',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `Product Owner ${accepted ? 'chấp nhận' : 'từ chối'} tính năng cuối cùng cho task "${task.name}"`,
    isPrimary: true
  });

  await task.save();

  // Gửi notification nếu PO từ chối
  if (!accepted) {
    try {
      // Lấy thông tin module và project cho thông báo
      const sprintDoc = await Sprint.findById(task.sprint)
        .populate({
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        });
      let moduleName = '';
      let projectName = '';
      if (sprintDoc && sprintDoc.module && sprintDoc.module.project) {
        moduleName = sprintDoc.module.name;
        projectName = sprintDoc.module.project.name;
      }

      const populatedTask = await Task.findById(task._id)
        .populate('assignees', 'name email')
        .populate('reviewers', 'name email');

      const rejectionMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã bị Product Owner từ chối chấp nhận. Vui lòng liên hệ PO để biết thêm chi tiết và điều chỉnh lại công việc.`;

      // Thông báo cho assignees
      if (populatedTask.assignees && populatedTask.assignees.length > 0) {
        for (const assignee of populatedTask.assignees) {
          const notification = await Notification.create({
            user: assignee._id,
            type: 'task_po_rejected',
            refId: task._id.toString(),
            message: rejectionMessage
          });
          try {
            socketManager.sendNotification(assignee._id, notification);
          } catch (err) {
            console.error('sendNotification assignee on PO rejection error', err);
          }
        }
      }

      // Thông báo cho reviewers
      if (populatedTask.reviewers && populatedTask.reviewers.length > 0) {
        for (const reviewer of populatedTask.reviewers) {
          const notification = await Notification.create({
            user: reviewer._id,
            type: 'task_po_rejected',
            refId: task._id.toString(),
            message: rejectionMessage
          });
          try {
            socketManager.sendNotification(reviewer._id, notification);
          } catch (err) {
            console.error('sendNotification reviewer on PO rejection error', err);
          }
        }
      }

      // Thông báo cho PM
      const pms = await User.find({ role: 'PM' });
      for (const pm of pms) {
        const notification = await Notification.create({
          user: pm._id,
          type: 'task_po_rejected',
          refId: task._id.toString(),
          message: rejectionMessage
        });
        try {
          socketManager.sendNotification(pm._id, notification);
        } catch (err) {
          console.error('sendNotification pm on PO rejection error', err);
        }
      }

      // Thông báo cho BA
      const bas = await User.find({ role: 'BA' });
      for (const ba of bas) {
        const notification = await Notification.create({
          user: ba._id,
          type: 'task_po_rejected',
          refId: task._id.toString(),
          message: rejectionMessage
        });
        try {
          socketManager.sendNotification(ba._id, notification);
        } catch (err) {
          console.error('sendNotification ba on PO rejection error', err);
        }
      }

    } catch (notifyErr) {
      console.error('updatePOAcceptance notification error:', notifyErr);
    }
  }

  // Lấy lại thông tin task mới nhất sau khi đã cập nhật
  const updatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email avatar')
    .populate('reviewers', 'name email avatar');

  if (updatedTask) {
    // Phát sự kiện cập nhật task
    socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
      sprintId: updatedTask.sprint.toString(),
      updatedTask: updatedTask.toObject()
    });
  }

  res.json(updatedTask);
});

// Thêm hàm lấy tất cả task
exports.getAllTasks = catchAsync(async (req, res, next) => {
  const tasks = await Task.find()
    .populate('assignees', 'name email')
    .populate('reviewers', 'name email')
    .populate('createdBy', 'name email')
    .populate('sprint', 'name')
    .populate('project', 'name');
  res.json(tasks);
});

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadTaskFile = catchAsync(async (req, res, next) => {
  // `loadTask` middleware đã nạp task vào `req.task` cho các route chứa `:id`
  const task = req.task || await Task.findById(req.params.taskId);
  if (!task) return next(AppError(404, 'Task not found'));

  const file = (task.docs || []).find(f => f.publicId === req.params.fileId);
  if (!file) return next(AppError(404, 'File not found'));

  // Lấy file từ Cloudinary
  try {
    const fileResponse = await axios.get(file.url, { responseType: 'stream' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    fileResponse.data.pipe(res);
  } catch (err) {
    console.error('Error fetching file for download:', err.message || err);
    return next(AppError(500, 'Không thể tải tệp, vui lòng thử lại sau.'));
  }
});

// Upload file hoàn thành (completion files)
exports.uploadCompletionFiles = catchAsync(async (req, res, next) => {
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  // Chỉ cho phép upload file hoàn thành khi task đang trong quá trình thực hiện hoặc đang sửa
  if (task.status !== 'Đang làm' && task.status !== 'Đang sửa') {
    return next(AppError(400, 'Chỉ có thể upload file hoàn thành khi task đang ở trạng thái "Đang làm" hoặc "Đang sửa".'));
  }

  // Kiểm tra có files được upload không
  if (!req.files || req.files.length === 0) {
    return next(AppError(400, 'Vui lòng chọn ít nhất một file để upload.'));
  }

  const { description } = req.body;

  // Thêm các file hoàn thành mới vào mảng
  for (const file of req.files) {
    task.completionFiles.push({
      url: file.path,
      publicId: file.filename,
      fileName: file.originalname,
      fileSize: file.size,
      contentType: file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      description: description || 'File hoàn thành công việc'
    });

    task.history.push({
      action: 'upload file hoàn thành',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã upload file hoàn thành "${file.originalname}" cho task "${task.name}"`,
      isPrimary: true
    });
  }

  const oldStatus = task.status;

  // Sau khi upload thành công, nếu đang Đang làm hoặc Đang sửa thì chuyển task sang trạng thái Đang xem xét
  if (oldStatus === 'Đang làm' || oldStatus === 'Đang sửa') {
    task.status = 'Đang xem xét';
    task.reviewStatus = 'Chưa';
  }

  await task.save();

  // Đồng bộ tiến độ khi trạng thái thay đổi sang Đang xem xét
  if (oldStatus !== task.status && task.status === 'Đang xem xét') {
    try {
      await handleTaskStatusChange(task._id, 'Đang xem xét', req.user._id);
    } catch (err) {
      console.error('uploadCompletionFiles: handleTaskStatusChange error', err);
    }
  }

  // Phát socket event cập nhật task
  const updatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email avatar')
    .populate('reviewers', 'name email avatar');

  if (updatedTask) {
    socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
      sprintId: updatedTask.sprint.toString(),
      updatedTask: updatedTask.toObject()
    });
  }

  // Gửi notification cho reviewer/PM/BA khi upload file xong và task chuyển sang "Đang xem xét"
  try {
    if (oldStatus !== task.status && task.status === 'Đang xem xét') {
      const sprintDoc = await Sprint.findById(task.sprint)
        .populate({
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        });
      let moduleName = '';
      let projectName = '';
      if (sprintDoc && sprintDoc.module && sprintDoc.module.project) {
        moduleName = sprintDoc.module.name;
        projectName = sprintDoc.module.project.name;
      }

      const populatedTask = await Task.findById(task._id)
        .populate('reviewers', 'name email')
        .populate('assignees', 'name email');

      // Thông báo cho reviewers
      if (populatedTask.reviewers && populatedTask.reviewers.length > 0) {
        for (const reviewer of populatedTask.reviewers) {
          const reviewerMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được ${populatedTask.assignees?.[0]?.name || 'người thực hiện'} upload file hoàn thành và đang chờ đánh giá. Vui lòng xem file và đưa ra nhận xét.`;

          const notification = await Notification.create({
            user: reviewer._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: reviewerMessage
          });
          try {
            socketManager.sendNotification(reviewer._id, notification);
          } catch (err) {
            console.error('sendNotification reviewer on uploadCompletionFiles error', err);
          }
        }
      }

      // Thông báo cho PM về task đang chờ review
      const pms = await User.find({ role: 'PM' });
      const pmMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được ${populatedTask.assignees?.[0]?.name || 'người thực hiện'} upload file hoàn thành và đang chờ đánh giá từ ${populatedTask.reviewers?.map(r => r.name).join(', ') || 'người đánh giá'}.`;

      for (const pm of pms) {
        try {
          const notification = await Notification.create({
            user: pm._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: pmMessage
          });
          try {
            socketManager.sendNotification(pm._id, notification);
          } catch (err) {
            console.error('sendNotification pm on uploadCompletionFiles error', err);
          }
        } catch (err) {
          console.error('uploadCompletionFiles: failed to create pm notification', err);
        }
      }

      // Thông báo cho BA về task đang chờ review
      const bas = await User.find({ role: 'BA' });
      const baMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã có file hoàn thành và đang chờ đánh giá. Vui lòng kiểm tra chất lượng công việc nếu cần thiết.`;

      for (const ba of bas) {
        try {
          const notification = await Notification.create({
            user: ba._id,
            type: 'task_pending_review',
            refId: task._id.toString(),
            message: baMessage
          });
          try {
            socketManager.sendNotification(ba._id, notification);
          } catch (err) {
            console.error('sendNotification ba on uploadCompletionFiles error', err);
          }
        } catch (err) {
          console.error('uploadCompletionFiles: failed to create ba notification', err);
        }
      }
    }
  } catch (notifyErr) {
    console.error('uploadCompletionFiles notification error:', notifyErr);
  }

  res.json({
    message: 'File hoàn thành đã được upload thành công',
    task: updatedTask
  });
});

// Download completion file
exports.downloadCompletionFile = catchAsync(async (req, res, next) => {
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

// ...
  // Kiểm tra quyền truy cập: chỉ assignee, reviewer, PM, BA mới được xem
  const isAuthorized =
    (task.assignees && task.assignees.some(assignee => assignee.toString() === req.user._id.toString())) ||
    (task.reviewers && task.reviewers.some(reviewer => reviewer.toString() === req.user._id.toString())) ||
    req.user.role === 'PM' ||
    req.user.role === 'BA';

  if (!isAuthorized) {
    return next(AppError(403, 'Bạn không có quyền truy cập file hoàn thành của task này.'));
  }

  const file = task.completionFiles.find(f => f.publicId === req.params.fileId);
  if (!file) return next(AppError(404, 'File không tồn tại'));

  // Lấy file từ Cloudinary
  const fileResponse = await axios.get(file.url, { responseType: 'stream' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  fileResponse.data.pipe(res);
});

// Lấy danh sách completion files
exports.getCompletionFiles = catchAsync(async (req, res, next) => {
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  // Kiểm tra quyền truy cập: chỉ assignee, reviewer, PM, BA mới được xem
  const isAuthorized =
    (task.assignees && task.assignees.some(assignee => assignee.toString() === req.user._id.toString())) ||
    (task.reviewers && task.reviewers.some(reviewer => reviewer.toString() === req.user._id.toString())) ||
    req.user.role === 'PM' ||
    req.user.role === 'BA';

  if (!isAuthorized) {
    return next(AppError(403, 'Bạn không có quyền truy cập file hoàn thành của task này.'));
  }

  res.json(task.completionFiles || []);
});

// Xóa completion file
exports.deleteCompletionFile = catchAsync(async (req, res, next) => {
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));

  // Chỉ assignee hoặc PM mới có thể xóa file hoàn thành
  const isAssignee = task.assignees && task.assignees.some(assignee => assignee.toString() === req.user._id.toString());
  if (!isAssignee && req.user.role !== 'PM') {
    return next(AppError(403, 'Bạn không có quyền xóa file hoàn thành này.'));
  }

  const fileIndex = task.completionFiles.findIndex(f => f.publicId === req.params.fileId);
  if (fileIndex === -1) return next(AppError(404, 'File không tồn tại'));

  const file = task.completionFiles[fileIndex];

  // Xóa file từ Cloudinary
  try {
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw' });
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }

  // Xóa file khỏi mảng
  task.completionFiles.splice(fileIndex, 1);

  // Thêm lịch sử xóa file
  task.history.push({
    action: 'xóa file hoàn thành',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã xóa file hoàn thành "${file.fileName}" khỏi task "${task.name}"`,
    isPrimary: true
  });

  await task.save();

  // Phát socket event cập nhật task
  const updatedTask = await Task.findById(task._id)
    .populate('assignees', 'name email avatar')
    .populate('reviewers', 'name email avatar');

  if (updatedTask) {
    socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
      sprintId: updatedTask.sprint.toString(),
      updatedTask: updatedTask.toObject()
    });
  }

  res.json({
    message: 'File hoàn thành đã được xóa thành công',
    task: updatedTask
  });
});

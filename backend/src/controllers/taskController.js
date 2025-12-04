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
const { createNotification } = require('../services/notificationService');
const { handleTaskStatusChange } = require('../services/progressService');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Helper: cập nhật trạng thái tự động cho Sprint, Module, Project
async function updateStatusAfterTaskChange(sprintId) {
  try {
    // Cập nhật trạng thái Sprint - don't populate module initially to avoid validation issues
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return;
    
    const tasks = await Task.find({ sprint: sprint._id });
    // Mapping trạng thái Sprint
    let sprintStatus = 'Chưa bắt đầu';
    if (tasks.length === 0 || tasks.every(t => t.status === 'Chưa làm')) {
      sprintStatus = 'Chưa bắt đầu';
    } else if (tasks.some(t => t.status === 'Đang làm' || t.status === 'Hoàn thành')) {
      sprintStatus = 'Đang thực hiện';
    }
    // Sprint chỉ hoàn thành khi TẤT CẢ task đều được review "Đạt"
    if (tasks.length > 0 && tasks.every(t => t.reviewStatus === 'Đạt')) {
      sprintStatus = 'Hoàn thành';
    }
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

// Tạo task mới
exports.createTask = catchAsync(async (req, res, next) => {
  // Debug logs to help trace 500 errors during creation
  console.log('createTask: start', { user: req.user?._id?.toString(), role: req.user?.role, bodyKeys: Object.keys(req.body || {}) });

  // Kiểm tra quyền tạo task theo role (double check sau middleware)
  const allowedRoles = ['PM', 'BA', 'QA Tester', 'Scrum Master', 'Product Owner'];
  if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
    return next(AppError(403, `Role "${req.user?.role || 'Unknown'}" không có quyền tạo task. Chỉ PM, BA, QA Tester, Scrum Master và Product Owner mới có quyền này.`));
  }

  const { taskId, name, goal, assignee, reviewer, sprint, startDate, taskEndDate } = req.body;
  
  // Validate required fields
  if (!taskId || !name || !assignee || !reviewer || !sprint) {
    return next(AppError(400, 'Thiếu thông tin bắt buộc: taskId, name, assignee, reviewer, sprint'));
  }
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sprint)) {
    return next(AppError(400, 'Sprint ID không hợp lệ'));
  }
  if (!mongoose.Types.ObjectId.isValid(assignee)) {
    return next(AppError(400, 'Assignee ID không hợp lệ'));
  }
  if (!mongoose.Types.ObjectId.isValid(reviewer)) {
    return next(AppError(400, 'Reviewer ID không hợp lệ'));
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
    createdBy: req.user._id,
    assignee,
    reviewer,
    sprint: sprintDoc._id,
    project: sprintDoc.module.project._id,
    status: 'Chưa làm',
    reviewStatus: 'Chưa',
    startDate: processedStartDate,
    endDate: processedEndDate,
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
    .populate('assignee', 'name email')
    .populate('reviewer', 'name email');
  console.log('createTask: populatedTask loaded', { populatedAssignee: !!populatedTask.assignee, populatedReviewer: !!populatedTask.reviewer });

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

  // Notification cho assignee
  if (populatedTask.assignee) {
    try {
      const assigneeMessage = `Bạn được phân công thực hiện task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Hạn chót: ${formattedEndDate}.`;
      const notification = await Notification.create({
        user: populatedTask.assignee._id,
        type: 'task_assigned',
        refId: task._id.toString(),
        message: assigneeMessage
      });
      try { socketManager.sendNotification(populatedTask.assignee._id, notification); } catch (err) { console.error('sendNotification assignee error', err); }
    } catch (err) {
      console.error('createTask: failed to create assignee notification', err);
    }
  }

  // Notification cho reviewer
  if (populatedTask.reviewer) {
    try {
      const reviewerMessage = `Bạn được phân công đánh giá kết quả task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Hạn chót: ${formattedEndDate}.`;
      const notification = await Notification.create({
        user: populatedTask.reviewer._id,
        type: 'task_review_assigned',
        refId: task._id.toString(),
        message: reviewerMessage
      });
      try { socketManager.sendNotification(populatedTask.reviewer._id, notification); } catch (err) { console.error('sendNotification reviewer error', err); }
    } catch (err) {
      console.error('createTask: failed to create reviewer notification', err);
    }
  }

  // Gửi notification cho tất cả DEV và BA về task mới (không phải assignee/reviewer)
  const excludedIds = [];
  if (populatedTask.assignee) excludedIds.push(populatedTask.assignee._id);
  if (populatedTask.reviewer) excludedIds.push(populatedTask.reviewer._id);

  const query = { role: { $in: ['Developer', 'BA'] } };
  if (excludedIds.length > 0) {
    query._id = { $nin: excludedIds };
  }
  const otherUsers = await User.find(query);
  console.log('createTask: otherUsers count', { count: otherUsers.length });

  const assigneeName = populatedTask.assignee ? populatedTask.assignee.name : 'Chưa có';
  const reviewerName = populatedTask.reviewer ? populatedTask.reviewer.name : 'Chưa có';
  const taskCreatedMessage = `Task mới "${task.name}" đã được tạo trong sprint "${sprintWithModule.name}". Assignee: ${assigneeName}, Reviewer: ${reviewerName}.`; // sprintWithModule.name nên luôn có

  // Gửi cho các user khác
  for (const user of otherUsers) {
    try {
      const notification = await Notification.create({
        user: user._id,
        type: 'task_created',
        refId: task._id.toString(),
        message: taskCreatedMessage
      });
      try { socketManager.sendNotification(user._id, notification); } catch (err) { console.error('sendNotification otherUsers error', err); }
    } catch (err) {
      console.error('createTask: failed to create notification for user', { user: user._id, err: err.message || err });
    }
  }
  // Populate task đầy đủ trước khi trả về để frontend có đầy đủ thông tin
  populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name email')
    .populate('reviewer', 'name email')
    .populate('createdBy', 'name email')
    .populate('sprint', 'name')
    .populate('project', 'name');
  
  console.log('createTask: completed successfully, returning 201', { taskId: task._id.toString() });
  res.status(201).json(populatedTask);
});

// Lấy danh sách task theo sprint
exports.getTasksBySprint = catchAsync(async (req, res, next) => {
  const { sprintId } = req.params;
  const tasks = await Task.find({ sprint: sprintId })
    .populate('assignee', 'name email')
    .populate('reviewer', 'name email')
    .populate('createdBy', 'name email');
  res.json(tasks);
});

// Lấy chi tiết task
exports.getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignee', 'name email avatar')
    .populate('reviewer', 'name email avatar')
    .populate('sprint', 'name'); // Thêm populate cho sprint
  if (!task) return next(AppError(404, 'Task not found'));
  res.json(task);
});

// Cập nhật task
exports.updateTask = catchAsync(async (req, res, next) => {
  const { name, goal, assignee, reviewer, priority, estimatedHours, keepFiles, businessWorkflow, startDate, endDate, handoverComment, fromUser } = req.body;
  const task = req.task; // Sử dụng task đã được load từ middleware 'loadTask'
  if (!task) return next(AppError(404, 'Task not found'));
  
  const oldValue = {
    name: task.name,
    goal: task.goal,
    assignee: task.assignee,
    reviewer: task.reviewer,
    priority: task.priority,
    estimatedHours: task.estimatedHours
  };

  // Check if this is a handover operation
  const isHandover = (assignee && assignee !== task.assignee?.toString()) || 
                    (reviewer && reviewer !== task.reviewer?.toString());

  // Store original assignee for notification
  const originalAssignee = task.assignee;
  const originalReviewer = task.reviewer;

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
  if (assignee) task.assignee = assignee;
  if (reviewer) task.reviewer = reviewer;
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
    task.history.push({
      action: 'handover',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã bàn giao task "${task.name}" từ ${originalAssignee?.name || 'chưa có'} sang ${assignee}`,
      isPrimary: true,
      task: task._id
    });

    // Send handover notifications
    const handoverNotificationService = require('../services/handoverNotificationService');
    const User = require('../models/User');
    
    try {
      // Get user details
      const [newAssigneeUser, newReviewerUser] = await Promise.all([
        assignee ? User.findById(assignee) : null,
        reviewer ? User.findById(reviewer) : null
      ]);

      // Send handover initiated notification
      await handoverNotificationService.sendHandoverInitiatedNotification(
        task,
        req.user,
        newAssigneeUser,
        newReviewerUser
      );
    } catch (notificationError) {
      console.error('Error sending handover notifications:', notificationError);
    }
  } else {
    // Check if assignee changed (not handover, but assignment)
    if (assignee && assignee !== task.assignee?.toString()) {
      // Send task assignment notification
      const { createWorkflowNotification } = require('../services/notificationService');
      const User = require('../models/User');
      
      try {
        const newAssigneeUser = await User.findById(assignee);
        if (newAssigneeUser) {
          await createWorkflowNotification('task_assigned', {
            taskName: task.name,
            taskId: task.taskId,
            assignerName: req.user.name
          }, {
            assigneeId: newAssigneeUser._id
          });
        }
      } catch (notificationError) {
        console.error('Error sending task assignment notification:', notificationError);
      }
    }

    // Check if reviewer changed
    if (reviewer && reviewer !== task.reviewer?.toString()) {
      // Send task review assignment notification
      const { createWorkflowNotification } = require('../services/notificationService');
      const User = require('../models/User');
      
      try {
        const newReviewerUser = await User.findById(reviewer);
        if (newReviewerUser) {
          await createWorkflowNotification('task_review_assigned', {
            taskName: task.name,
            taskId: task.taskId
          }, {
            reviewerId: newReviewerUser._id
          });
        }
      } catch (notificationError) {
        console.error('Error sending task review assignment notification:', notificationError);
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
  const assigneeId = task.assignee;
  const reviewerId = task.reviewer;
  const taskName = task.name;
  const deletedBy = req.user.name; // Lấy tên người xóa từ token

  const notificationMessage = `Task "${taskName}" đã bị xóa bởi ${deletedBy}.`;

  // Gửi thông báo cho người thực hiện (nếu có)
  try {
    if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
      await createNotification(assigneeId, notificationMessage, 'task_deleted', task._id.toString());
    }
  } catch (notifError) {
    console.error('Error creating assignee notification on task delete:', notifError);
  }

  // Gửi thông báo cho người review (nếu có)
  try {
    if (reviewerId && reviewerId.toString() !== req.user._id.toString()) {
      await createNotification(reviewerId, notificationMessage, 'task_deleted', task._id.toString());
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
  const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
  const isReviewer = task.reviewer && task.reviewer.toString() === req.user._id.toString();
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

    // Nếu task được cập nhật thành "Hoàn thành" => reset reviewStatus về "Chưa" và kiểm tra file hoàn thành
    if (status === 'Hoàn thành') {
      // Kiểm tra xem có completion files không
      if (!task.completionFiles || task.completionFiles.length === 0) {
        return next(AppError(400, 'Vui lòng upload file hoàn thành (work files hoặc PDF review) trước khi đánh dấu task là hoàn thành.'));
      }
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
      .populate('assignee', 'name email avatar')
      .populate('reviewer', 'name email avatar');
      
    if (updatedTask) {
      // Phát sự kiện cập nhật task
      socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
        sprintId: updatedTask.sprint.toString(),
        updatedTask: updatedTask.toObject()
      });
    }

    await updateStatusAfterTaskChange(task.sprint);

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
        .populate('reviewer', 'name email')
        .populate('assignee', 'name email');

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
  const oldReviewStatus = task.reviewStatus;

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
    sprintDoc.release &&
    sprintDoc.release.module &&
    sprintDoc.release.module.project
  ) {
    moduleName = sprintDoc.release.module.name;
    projectName = sprintDoc.release.module.project.name;
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
    if (reviewStatus === 'Không đạt') {
      task.status = 'Đang làm';
      // Gọi dịch vụ tiến độ cho trạng thái mới
      await handleTaskStatusChange(task._id, 'Đang làm', req.user._id);
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
    if (task.assignee) {
      try {
        const assigneeMessage = comment && comment.trim()
          ? `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được đánh giá "${reviewStatus}". Nhận xét: ${comment.trim()}`
          : `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã được đánh giá "${reviewStatus}".`;

        const notification = await Notification.create({
          user: task.assignee._id,
          type: 'task_reviewed',
          refId: task._id.toString(),
          message: assigneeMessage
        });

        try { socketManager.sendNotification(task.assignee._id, notification); } catch (err) { console.error('sendNotification assignee on review error', err); }
      } catch (err) {
        console.error('createTask: failed to create task_reviewed notification', err);
      }
    }

    await updateStatusAfterTaskChange(task.sprint);
    // Phát socket event cho tất cả client cùng sprint
    // Lấy lại thông tin task mới nhất sau khi đã cập nhật và populate thông tin cần thiết
    const updatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email avatar')
      .populate('reviewer', 'name email avatar');
      
    if (updatedTask) {
      // Sử dụng broadcastToSprintRoom để gửi sự kiện cập nhật task
      socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
        sprintId: updatedTask.sprint.toString(),
        updatedTask: updatedTask.toObject()
      });
    }
    res.json(task);
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

// Thêm hàm lấy tất cả task
exports.getAllTasks = catchAsync(async (req, res, next) => {
  const tasks = await Task.find()
    .populate('assignee', 'name email')
    .populate('reviewer', 'name email');
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

  // Kiểm tra có files được upload không
  if (!req.files || req.files.length === 0) { // Chỉ giữ lại logic kiểm tra mảng files
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

    // Thêm lịch sử upload completion file
    task.history.push({
      action: 'upload file hoàn thành',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã upload file hoàn thành "${file.originalname}" cho task "${task.name}"`,
      isPrimary: true
    });
  }

  // Cập nhật trạng thái task thành 'Hoàn thành' và reviewStatus thành 'Chưa'
  const oldStatus = task.status; // Lưu lại trạng thái cũ
  task.status = 'Hoàn thành';
  task.reviewStatus = 'Chưa';

  // Thêm lịch sử cập nhật trạng thái
  task.history.push({
    action: 'cập nhật trạng thái',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã cập nhật trạng thái của task "${task.name}" từ "${oldStatus}" thành "Hoàn thành" sau khi upload file hoàn thành`,
    isPrimary: false
  });

  await task.save();

  // Gọi dịch vụ tiến độ
  await handleTaskStatusChange(task._id, 'Hoàn thành', req.user._id);

  // Gửi notification cho reviewer và BA khi có file hoàn thành mới
  const sprintDoc = await Sprint.findById(task.sprint)
    .populate({
      path: 'release',
      populate: {
        path: 'module',
        populate: {
          path: 'project',
          select: 'name'
        }
      }
    });

  let moduleName = '';
  let projectName = '';
  if (sprintDoc && sprintDoc.module && sprintDoc.module.project) {
    moduleName = sprintDoc.module.name;
    projectName = sprintDoc.module.project.name;
  }

  // Notification cho reviewer
  if (task.reviewer) {
    const reviewerMessage = `Người thực hiện đã upload file hoàn thành cho task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Bạn có thể xem file và chuẩn bị đánh giá.`;

    const notification = await Notification.create({
      user: task.reviewer._id,
      type: 'task_completion_file_uploaded',
      refId: task._id.toString(),
      message: reviewerMessage
    });

    socketManager.sendNotification(task.reviewer._id, notification);
  }

  // Notification cho BA về file hoàn thành để review chất lượng
  const bas = await User.find({ role: 'BA' });
  const baFileMessage = `File hoàn thành đã được upload cho task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Vui lòng kiểm tra chất lượng công việc.`;

  for (const ba of bas) {
    const notification = await Notification.create({
      user: ba._id,
      type: 'task_completion_file_uploaded',
      refId: task._id.toString(),
      message: baFileMessage
    });
    socketManager.sendNotification(ba._id, notification);
  }

  // Phát socket event cập nhật task
  const updatedTask = await Task.findById(task._id)
    .populate('assignee', 'name email avatar')
    .populate('reviewer', 'name email avatar');
    
  if (updatedTask) {
    socketManager.broadcastToSprintRoom(updatedTask.sprint.toString(), 'taskUpdated', {
      sprintId: updatedTask.sprint.toString(),
      updatedTask: updatedTask.toObject()
    });
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

  // Kiểm tra quyền truy cập: chỉ assignee, reviewer, PM, BA mới được xem
  const isAuthorized = 
    task.assignee.toString() === req.user._id.toString() ||
    task.reviewer.toString() === req.user._id.toString() ||
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
    task.assignee.toString() === req.user._id.toString() ||
    task.reviewer.toString() === req.user._id.toString() ||
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
  if (task.assignee.toString() !== req.user._id.toString() && req.user.role !== 'PM') {
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
    .populate('assignee', 'name email avatar')
    .populate('reviewer', 'name email avatar');

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

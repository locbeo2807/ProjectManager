const Epic = require('../models/Epic');
const Task = require('../models/Task');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const { createError } = require('../utils/error');
const { canAccessResource } = require('../utils/permissions');

// Tạo epic mới
exports.createEpic = async (req, res, next) => {
  try {
    const { title, description, priority, project, sprint, assignee, acceptanceCriteria, estimatedEffort, startDate, endDate, tags, businessValue, riskLevel } = req.body;

    // Kiểm tra xem dự án có tồn tại không
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'create', { createdBy: req.user._id })) {
      return next(createError(403, 'You do not have permission to create epics'));
    }

    // Tạo epic
    const epic = new Epic({
      title,
      description,
      priority: priority || 'Medium',
      project,
      sprint,
      assignee,
      acceptanceCriteria: acceptanceCriteria || [],
      estimatedEffort,
      startDate,
      endDate,
      tags: tags || [],
      businessValue,
      riskLevel: riskLevel || 'Low',
      createdBy: req.user._id
    });

    await epic.save();

    // Điền các tham chiếu
    await epic.populate([
      { path: 'project', select: 'name projectId' },
      { path: 'sprint', select: 'name' },
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json(epic);
  } catch (error) {
    next(error);
  }
};

// Lấy tất cả epic cho một dự án
exports.getEpicsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Kiểm tra xem dự án có tồn tại không
    const project = await Project.findById(projectId);
    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'read', project)) {
      return next(createError(403, 'You do not have permission to view epics in this project'));
    }

    const epics = await Epic.find({ project: projectId })
      .populate('assignee', 'name email userID')
      .populate('sprint', 'name startDate endDate')
      .populate('createdBy', 'name email')
      .populate('userStories', 'name status reviewStatus taskId')
      .sort({ createdAt: -1 });

    res.json(epics);
  } catch (error) {
    next(error);
  }
};

// Lấy epic theo ID
exports.getEpic = async (req, res, next) => {
  try {
    const epic = await Epic.findById(req.params.id)
      .populate('project', 'name projectId description')
      .populate('sprint', 'name startDate endDate status')
      .populate('assignee', 'name email userID role')
      .populate('createdBy', 'name email userID')
      .populate({
        path: 'userStories',
        select: 'name status reviewStatus taskId priority estimatedHours',
        populate: [
          { path: 'assignee', select: 'name email' },
          { path: 'reviewer', select: 'name email' }
        ]
      });

    if (!epic) {
      return next(createError(404, 'Epic not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'read', epic)) {
      return next(createError(403, 'You do not have permission to view this epic'));
    }

    res.json(epic);
  } catch (error) {
    next(error);
  }
};

// Cập nhật epic
exports.updateEpic = async (req, res, next) => {
  try {
    const epic = await Epic.findById(req.params.id);
    if (!epic) {
      return next(createError(404, 'Epic not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'update', epic)) {
      return next(createError(403, 'You do not have permission to update this epic'));
    }

    const allowedFields = [
      'title', 'description', 'priority', 'status', 'sprint', 'assignee',
      'acceptanceCriteria', 'estimatedEffort', 'actualEffort', 'startDate',
      'endDate', 'tags', 'businessValue', 'riskLevel'
    ];

    // Cập nhật các trường được phép
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        epic[field] = req.body[field];
      }
    });

    await epic.save();

    // Điền các tham chiếu
    await epic.populate([
      { path: 'project', select: 'name projectId' },
      { path: 'sprint', select: 'name' },
      { path: 'assignee', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.json(epic);
  } catch (error) {
    next(error);
  }
};

// Xóa epic
exports.deleteEpic = async (req, res, next) => {
  try {
    const epic = await Epic.findById(req.params.id);
    if (!epic) {
      return next(createError(404, 'Epic not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'delete', epic)) {
      return next(createError(403, 'You do not have permission to delete this epic'));
    }

    // Kiểm tra xem epic có user stories không
    if (epic.userStories && epic.userStories.length > 0) {
      return next(createError(400, 'Cannot delete epic with existing user stories. Move or delete user stories first.'));
    }

    await epic.deleteOne();
    res.json({ message: 'Epic deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Thêm user story vào epic
exports.addUserStoryToEpic = async (req, res, next) => {
  try {
    const { epicId, taskId } = req.params;

    const epic = await Epic.findById(epicId);
    const task = await Task.findById(taskId);

    if (!epic) {
      return next(createError(404, 'Epic not found'));
    }

    if (!task) {
      return next(createError(404, 'Task not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'update', epic)) {
      return next(createError(403, 'You do not have permission to modify this epic'));
    }

    // Kiểm tra xem task đã có trong epic khác chưa
    const existingEpic = await Epic.findOne({ userStories: taskId });
    if (existingEpic && existingEpic._id.toString() !== epicId) {
      return next(createError(400, 'Task is already assigned to another epic'));
    }

// Thêm task vào epic nếu chưa có
    if (!epic.userStories.includes(taskId)) {
      epic.userStories.push(taskId);
      await epic.save();
    }

    // Cập nhật task với tham chiếu epic
    task.epic = epicId;
    await task.save();

    res.json({ message: 'User story added to epic successfully', epic });
  } catch (error) {
    next(error);
  }
};

// Xóa user story khỏi epic
exports.removeUserStoryFromEpic = async (req, res, next) => {
  try {
    const { epicId, taskId } = req.params;

    const epic = await Epic.findById(epicId);
    const task = await Task.findById(taskId);

    if (!epic) {
      return next(createError(404, 'Epic not found'));
    }

    if (!task) {
      return next(createError(404, 'Task not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Epic', 'update', epic)) {
      return next(createError(403, 'You do not have permission to modify this epic'));
    }

    // Xóa task khỏi epic
    epic.userStories = epic.userStories.filter(id => id.toString() !== taskId);
    await epic.save();

    // Xóa tham chiếu epic khỏi task
    task.epic = undefined;
    await task.save();

    res.json({ message: 'User story removed from epic successfully', epic });
  } catch (error) {
    next(error);
  }
};

// Lấy thống kê epic
exports.getEpicStats = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const stats = await Epic.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalEpics: { $sum: 1 },
          completedEpics: {
            $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] }
          },
          inProgressEpics: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          totalStoryPoints: { $sum: '$estimatedEffort' },
          completedStoryPoints: {
            $sum: { $cond: [{ $eq: ['$status', 'Done'] }, '$estimatedEffort', 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalEpics: 0,
      completedEpics: 0,
      inProgressEpics: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0
    };

    result.completionRate = result.totalEpics > 0
      ? Math.round((result.completedEpics / result.totalEpics) * 100)
      : 0;

    res.json(result);
  } catch (error) {
    next(error);
  }
};
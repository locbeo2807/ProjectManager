const TechnicalDebt = require('../models/TechnicalDebt');
const Project = require('../models/Project');
const Module = require('../models/Module');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const mongoose = require('mongoose');
const { createError } = require('../utils/error');
const { canAccessResource } = require('../utils/permissions');
const socketManager = require('../socket');
const Notification = require('../models/Notification');

// Tạo nợ kỹ thuật
exports.createTechnicalDebt = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      severity,
      assignedTo,
      estimatedEffort,
      project,
      module,
      sprint,
      task,
      tags,
      impact,
      solution,
      prevention,
      recurring,
      frequency
    } = req.body;

    // Kiểm tra xem dự án có tồn tại không
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'create', { createdBy: req.user._id })) {
      return next(createError(403, 'You do not have permission to create technical debt'));
    }

    // Xác thực các thực thể liên quan nếu được cung cấp
    if (module) {
      const moduleExists = await Module.findById(module);
      if (!moduleExists) return next(createError(404, 'Module not found'));
    }

    if (sprint) {
      const sprintExists = await Sprint.findById(sprint);
      if (!sprintExists) return next(createError(404, 'Sprint not found'));
    }

    if (task) {
      const taskExists = await Task.findById(task);
      if (!taskExists) return next(createError(404, 'Task not found'));
    }

    // Tạo nợ kỹ thuật
    const technicalDebt = new TechnicalDebt({
      title,
      description,
      type,
      severity,
      assignedTo,
      estimatedEffort,
      project,
      module,
      sprint,
      task,
      tags: tags || [],
      impact,
      solution,
      prevention,
      recurring: recurring || false,
      frequency: frequency || 'One-time',
      createdBy: req.user._id
    });

    await technicalDebt.save();

    await technicalDebt.populateDetails();

    // Gửi thông báo cho người dùng được giao nếu khác với người tạo
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        user: assignedTo,
        type: 'technical_debt_assigned',
        refId: technicalDebt._id.toString(),
        message: `Bạn được giao xử lý technical debt: ${technicalDebt.title}`
      });
      socketManager.sendNotification(assignedTo, notification);
    }

    res.status(201).json(technicalDebt);
  } catch (error) {
    next(error);
  }
};

// Lấy nợ kỹ thuật theo dự án
exports.getTechnicalDebtsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, severity, type, assignedTo } = req.query;

    // Kiểm tra xem dự án có tồn tại không
    const project = await Project.findById(projectId);
    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'read', project)) {
      return next(createError(403, 'You do not have permission to view technical debt in this project'));
    }

    // Xây dựng bộ lọc
    const filter = { project: projectId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;

    const technicalDebts = await TechnicalDebt.find(filter)
      .populate('assignedTo', 'name email userID')
      .populate('createdBy', 'name email userID')
      .populate('resolvedBy', 'name email userID')
      .populate('module', 'name moduleId')
      .populate('sprint', 'name')
      .populate('task', 'name taskId status')
      .sort({ priority: -1, severity: -1, createdAt: -1 });

    res.json(technicalDebts);
  } catch (error) {
    next(error);
  }
};

// Lấy nợ kỹ thuật theo ID
exports.getTechnicalDebt = async (req, res, next) => {
  try {
    const technicalDebt = await TechnicalDebt.findById(req.params.id)
      .populate('project', 'name projectId description')
      .populate('module', 'name moduleId status')
      .populate('sprint', 'name startDate endDate status')
      .populate('task', 'name taskId status priority')
      .populate('assignedTo', 'name email userID role')
      .populate('createdBy', 'name email userID')
      .populate('resolvedBy', 'name email userID');

    if (!technicalDebt) {
      return next(createError(404, 'Technical debt not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'read', technicalDebt)) {
      return next(createError(403, 'You do not have permission to view this technical debt'));
    }

    res.json(technicalDebt);
  } catch (error) {
    next(error);
  }
};

// Cập nhật nợ kỹ thuật
exports.updateTechnicalDebt = async (req, res, next) => {
  try {
    const technicalDebt = await TechnicalDebt.findById(req.params.id);
    if (!technicalDebt) {
      return next(createError(404, 'Technical debt not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'update', technicalDebt)) {
      return next(createError(403, 'You do not have permission to update this technical debt'));
    }

    const allowedFields = [
      'title', 'description', 'type', 'severity', 'assignedTo',
      'estimatedEffort', 'actualEffort', 'module', 'sprint', 'task',
      'tags', 'impact', 'solution', 'prevention', 'recurring', 'frequency'
    ];

    // Theo dõi các thay đổi giao việc để thông báo
    const oldAssignedTo = technicalDebt.assignedTo;

    // Cập nhật các trường được phép
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        technicalDebt[field] = req.body[field];
      }
    });

    await technicalDebt.save();

    await technicalDebt.populateDetails();

    // Thông báo cho người được giao mới nếu có thay đổi
    if (technicalDebt.assignedTo && technicalDebt.assignedTo.toString() !== (oldAssignedTo?.toString() || '') &&
        technicalDebt.assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        user: technicalDebt.assignedTo,
        type: 'technical_debt_assigned',
        refId: technicalDebt._id.toString(),
        message: `Bạn được giao xử lý technical debt: ${technicalDebt.title}`
      });
      socketManager.sendNotification(technicalDebt.assignedTo, notification);
    }

    res.json(technicalDebt);
  } catch (error) {
    next(error);
  }
};

// Cập nhật trạng thái nợ kỹ thuật
exports.updateTechnicalDebtStatus = async (req, res, next) => {
  try {
    const { status, actualEffort, resolvedBy } = req.body;

    if (!status) {
      return next(createError(400, 'Status is required'));
    }

    const technicalDebt = await TechnicalDebt.findById(req.params.id);
    if (!technicalDebt) {
      return next(createError(404, 'Technical debt not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'update', technicalDebt)) {
      return next(createError(403, 'You do not have permission to update this technical debt'));
    }

    const oldStatus = technicalDebt.status;
    technicalDebt.status = status;

    if (actualEffort !== undefined) {
      technicalDebt.actualEffort = actualEffort;
    }

    // Xử lý giải quyết
    if (status === 'Resolved' && oldStatus !== 'Resolved') {
      technicalDebt.resolvedBy = resolvedBy || req.user._id;
      technicalDebt.resolvedAt = new Date();
    }

    await technicalDebt.save();

    // Tạo thông báo cho việc giải quyết
    if (status === 'Resolved') {
      const notification = await Notification.create({
        user: technicalDebt.createdBy,
        type: 'technical_debt_resolved',
        refId: technicalDebt._id.toString(),
        message: `Technical debt "${technicalDebt.title}" đã được giải quyết`
      });
      socketManager.sendNotification(technicalDebt.createdBy, notification);
    }

    res.json(technicalDebt);
  } catch (error) {
    next(error);
  }
};

// Xóa nợ kỹ thuật
exports.deleteTechnicalDebt = async (req, res, next) => {
  try {
    const technicalDebt = await TechnicalDebt.findById(req.params.id);
    if (!technicalDebt) {
      return next(createError(404, 'Technical debt not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'TechnicalDebt', 'delete', technicalDebt)) {
      return next(createError(403, 'You do not have permission to delete this technical debt'));
    }

    await technicalDebt.deleteOne();
    res.json({ message: 'Technical debt deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Lấy thống kê nợ kỹ thuật
exports.getTechnicalDebtStats = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const stats = await TechnicalDebt.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: 1 },
          resolvedDebt: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          criticalDebt: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
          },
          urgentDebt: {
            $sum: { $cond: [{ $eq: ['$priority', 'Urgent'] }, 1, 0] }
          },
          totalEstimatedEffort: { $sum: '$estimatedEffort' },
          totalActualEffort: { $sum: '$actualEffort' },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $and: ['$resolvedAt', '$createdAt'] },
                { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] }, // days
                null
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalDebt: 0,
      resolvedDebt: 0,
      criticalDebt: 0,
      urgentDebt: 0,
      totalEstimatedEffort: 0,
      totalActualEffort: 0,
      avgResolutionTime: 0
    };

    result.resolutionRate = result.totalDebt > 0
      ? Math.round((result.resolvedDebt / result.totalDebt) * 100)
      : 0;

    res.json(result);
  } catch (error) {
    next(error);
  }
};
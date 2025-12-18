const Risk = require('../models/Risk');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Module = require('../models/Module');
const Sprint = require('../models/Sprint');
const mongoose = require('mongoose');
const { createError } = require('../utils/error');
const { canAccessResource } = require('../utils/permissions');
const socketManager = require('../socket');
const Notification = require('../models/Notification');

// Tạo rủi ro mới
exports.createRisk = async (req, res, next) => {
  try {
    const {
      title,
      description,
      impact,
      likelihood,
      riskType,
      assignedTo,
      mitigationPlan,
      mitigationDeadline,
      project,
      task,
      module,
      sprint,
      tags,
      cost
    } = req.body;

    // Kiểm tra xem dự án có tồn tại không
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'create', { createdBy: req.user._id })) {
      return next(createError(403, 'You do not have permission to create risks'));
    }

    // Xác thực các thực thể liên quan nếu được cung cấp
    if (task) {
      const taskExists = await Task.findById(task);
      if (!taskExists) return next(createError(404, 'Task not found'));
    }

    if (module) {
      const moduleExists = await Module.findById(module);
      if (!moduleExists) return next(createError(404, 'Module not found'));
    }

    if (sprint) {
      const sprintExists = await Sprint.findById(sprint);
      if (!sprintExists) return next(createError(404, 'Sprint not found'));
    }

    // Tạo rủi ro
    const risk = new Risk({
      title,
      description,
      impact,
      likelihood,
      riskType: riskType || 'Technical',
      assignedTo,
      mitigationPlan,
      mitigationDeadline,
      project,
      task,
      module,
      sprint,
      tags: tags || [],
      cost,
      createdBy: req.user._id
    });

    await risk.save();

    await risk.populateDetails();

    // Gửi thông báo cho người dùng được giao nếu khác với người tạo
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        user: assignedTo,
        type: 'risk_assigned',
        refId: risk._id.toString(),
        message: `Bạn được giao xử lý rủi ro: ${risk.title}`
      });
      socketManager.sendNotification(assignedTo, notification);
    }

    res.status(201).json(risk);
  } catch (error) {
    next(error);
  }
};

// Lấy rủi ro theo dự án
exports.getRisksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, riskType, assignedTo } = req.query;

    // Kiểm tra xem dự án có tồn tại không
    const project = await Project.findById(projectId);
    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'read', project)) {
      return next(createError(403, 'You do not have permission to view risks in this project'));
    }

    // Xây dựng bộ lọc
    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (riskType) filter.riskType = riskType;
    if (assignedTo) filter.assignedTo = assignedTo;

    const risks = await Risk.find(filter)
      .populate('assignedTo', 'name email userID')
      .populate('createdBy', 'name email userID')
      .populate('task', 'name taskId status')
      .populate('module', 'name moduleId')
      .populate('sprint', 'name')
      .sort({ priority: -1, createdAt: -1 }); // Rủi ro quan trọng trước

    res.json(risks);
  } catch (error) {
    next(error);
  }
};

// Lấy rủi ro theo ID
exports.getRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findById(req.params.id)
      .populate('project', 'name projectId description')
      .populate('task', 'name taskId status priority')
      .populate('module', 'name moduleId status')
      .populate('sprint', 'name startDate endDate status')
      .populate('assignedTo', 'name email userID role')
      .populate('createdBy', 'name email userID');

    if (!risk) {
      return next(createError(404, 'Risk not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'read', risk)) {
      return next(createError(403, 'You do not have permission to view this risk'));
    }

    res.json(risk);
  } catch (error) {
    next(error);
  }
};

// Cập nhật rủi ro
exports.updateRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) {
      return next(createError(404, 'Risk not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'update', risk)) {
      return next(createError(403, 'You do not have permission to update this risk'));
    }

    const allowedFields = [
      'title', 'description', 'impact', 'likelihood', 'status',
      'riskType', 'assignedTo', 'mitigationPlan', 'mitigationDeadline',
      'actualResolutionDate', 'tags', 'cost'
    ];

    // Theo dõi các thay đổi trạng thái để thông báo
    const oldStatus = risk.status;
    const oldAssignedTo = risk.assignedTo;

    // Cập nhật các trường được phép
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        risk[field] = req.body[field];
      }
    });

    await risk.save();

    await risk.populateDetails();

    // Gửi thông báo cho các thay đổi trạng thái
    if (oldStatus !== risk.status && risk.status === 'Closed') {
      // Thông báo cho người tạo khi rủi ro được đóng
      const notification = await Notification.create({
        user: risk.createdBy,
        type: 'risk_closed',
        refId: risk._id.toString(),
        message: `Rủi ro "${risk.title}" đã được giải quyết`
      });
      socketManager.sendNotification(risk.createdBy, notification);
    }

    // Thông báo cho người được giao mới nếu có thay đổi
    if (risk.assignedTo && risk.assignedTo.toString() !== (oldAssignedTo?.toString() || '') &&
        risk.assignedTo.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        user: risk.assignedTo,
        type: 'risk_assigned',
        refId: risk._id.toString(),
        message: `Bạn được giao xử lý rủi ro: ${risk.title}`
      });
      socketManager.sendNotification(risk.assignedTo, notification);
    }

    res.json(risk);
  } catch (error) {
    next(error);
  }
};

// Cập nhật trạng thái rủi ro
exports.updateRiskStatus = async (req, res, next) => {
  try {
    const { status, mitigationPlan } = req.body;

    if (!status) {
      return next(createError(400, 'Status is required'));
    }

    const risk = await Risk.findById(req.params.id);
    if (!risk) {
      return next(createError(404, 'Risk not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'update', risk)) {
      return next(createError(403, 'You do not have permission to update this risk'));
    }

    const oldStatus = risk.status;
    risk.status = status;

    if (mitigationPlan) {
      risk.mitigationPlan = mitigationPlan;
    }

    // Đặt ngày giải quyết khi đóng rủi ro
    if (status === 'Closed' && oldStatus !== 'Closed') {
      risk.actualResolutionDate = new Date();
    }

    await risk.save();

    // Tạo mục lịch sử
    risk.history = risk.history || [];
    risk.history.push({
      action: 'Status Update',
      description: `Status changed from ${oldStatus} to ${status}`,
      fromUser: req.user._id,
      timestamp: new Date()
    });

    await risk.save();

    res.json(risk);
  } catch (error) {
    next(error);
  }
};

// Xóa rủi ro
exports.deleteRisk = async (req, res, next) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) {
      return next(createError(404, 'Risk not found'));
    }

    // Kiểm tra quyền
    if (!canAccessResource(req.user, 'Risk', 'delete', risk)) {
      return next(createError(403, 'You do not have permission to delete this risk'));
    }

    await risk.deleteOne();
    res.json({ message: 'Risk deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Lấy thống kê rủi ro
exports.getRiskStats = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const stats = await Risk.aggregate([
      { $match: { project: mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalRisks: { $sum: 1 },
          criticalRisks: {
            $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] }
          },
          highRisks: {
            $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] }
          },
          mediumRisks: {
            $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] }
          },
          lowRisks: {
            $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] }
          },
          openRisks: {
            $sum: { $cond: [{ $in: ['$status', ['Identified', 'Assessed', 'Mitigated']] }, 1, 0] }
          },
          closedRisks: {
            $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] }
          },
          avgRiskScore: { $avg: { $multiply: ['$impact', '$likelihood'] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalRisks: 0,
      criticalRisks: 0,
      highRisks: 0,
      mediumRisks: 0,
      lowRisks: 0,
      openRisks: 0,
      closedRisks: 0,
      avgRiskScore: 0
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
};
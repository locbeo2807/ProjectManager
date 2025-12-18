const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../utils/permissions');
const upload = require('../middleware/cloudinaryUpload');
const Sprint = require('../models/Sprint');
const Module = require('../models/Module');

// Middleware để tải sprint
const loadSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    req.sprint = sprint;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CRUD Sprint
router.post('/', authenticate, requirePermission('Sprint', 'create'), upload.array('docs'), sprintController.createSprint);
router.get('/', authenticate, requirePermission('Sprint', 'read'), sprintController.getSprints);
router.get(
  '/:id',
  authenticate,
  loadSprint,
  requirePermission('Sprint', 'read', async (req) => {
    // Cho phép đọc sprint nếu user là thành viên sprint hoặc thành viên project chứa module của sprint
    const sprintMembers = req.sprint?.members?.map(m => m.user?.toString()) || [];
    let projectMembers = [];
    try {
      if (req.sprint?.module) {
        const moduleDoc = await Module.findById(req.sprint.module).populate('project');
        if (moduleDoc?.project?.members) {
          projectMembers = moduleDoc.project.members.map(m => m.user?.toString());
        }
      }
    } catch (e) {
      // Ignore module/project load errors; permission util sẽ xử lý với context hiện có
    }
    return { sprintMembers, projectMembers };
  }),
  sprintController.getSprint
);

router.put('/:id', authenticate, loadSprint, requirePermission('Sprint', 'update', (req) => ({ sprintMembers: req.sprint?.members?.map(m => m.user?.toString()) })), upload.array('docs'), sprintController.updateSprint);
router.delete('/:id', authenticate, loadSprint, requirePermission('Sprint', 'delete'), sprintController.deleteSprint);
router.get(
  '/:sprintId/files/:fileId(*)',
  authenticate,
  loadSprint,
  requirePermission('Sprint', 'read', async (req) => {
    // Dùng cùng logic với getSprint để đảm bảo chỉ member/project member mới tải file được
    const sprintMembers = req.sprint?.members?.map(m => m.user?.toString()) || [];
    let projectMembers = [];
    try {
      if (req.sprint?.module) {
        const moduleDoc = await Module.findById(req.sprint.module).populate('project');
        if (moduleDoc?.project?.members) {
          projectMembers = moduleDoc.project.members.map(m => m.user?.toString());
        }
      }
    } catch (e) {}
    return { sprintMembers, projectMembers };
  }),
  sprintController.downloadSprintFile
);

router.delete('/:sprintId/files/:fileId', authenticate, loadSprint, requirePermission('Sprint', 'delete'), sprintController.deleteSprintFile);
router.post('/:id/add-members', authenticate, loadSprint, requirePermission('Sprint', 'update', (req) => ({ sprintMembers: req.sprint?.members?.map(m => m.user?.toString()) })), sprintController.addMembersToSprint);

// Compatibility alias cũ theo release – tạm thời map sang moduleId để tránh 404 nếu FE chưa sửa hết
router.get('/by-release', authenticate, requirePermission('Sprint', 'read'), (req, res, next) => {
  return sprintController.getSprints(req, res, next);
});

router.get('/by-release/:moduleId', authenticate, requirePermission('Sprint', 'read'), (req, res, next) => {
  req.query.moduleId = req.params.moduleId;
  return sprintController.getSprints(req, res, next);
});

router.get('/by-module/:moduleId', authenticate, requirePermission('Sprint', 'read', (req) => {
  // Get project members from module to check permission
  return Module.findById(req.params.moduleId).populate('project').then(module => {
    if (!module || !module.project) return {};
    return {
      projectMembers: module.project.members?.map(m => m.user?.toString()) || []
    };
  }).catch(() => ({}));
}), (req, res, next) => {
  req.query.moduleId = req.params.moduleId;
  return sprintController.getSprints(req, res, next);
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../utils/permissions');
const upload = require('../middleware/cloudinaryUpload');
const Module = require('../models/Module');

// Middleware để tải module
const loadModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    req.module = module;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CRUD Module
router.post('/', authenticate, requirePermission('Module', 'create'), upload.array('docs'), moduleController.createModule);
router.get('/by-project/:projectId', authenticate, requirePermission('Module', 'read'), moduleController.getModulesByProject);
router.get('/:id', authenticate, loadModule, requirePermission('Module', 'read'), moduleController.getModule);
router.put('/:id', authenticate, loadModule, requirePermission('Module', 'update', (req) => ({ resourceOwner: req.module?.createdBy?.toString() })), upload.array('docs'), moduleController.updateModule);
router.delete('/:id', authenticate, loadModule, requirePermission('Module', 'delete'), moduleController.deleteModule);
router.post('/:id/add-members', authenticate, loadModule, moduleController.addMembersToModule);

// Lấy tất cả module (toàn hệ thống)
router.get('/', authenticate, requirePermission('Module', 'read'), moduleController.getAllModules);

// Module file operations
router.post('/:moduleId/files', authenticate, loadModule, requirePermission('Module', 'update'), upload.single('file'), moduleController.uploadModuleFile);
router.get('/:moduleId/files', authenticate, loadModule, requirePermission('Module', 'read'), moduleController.getModuleFiles);
router.get('/:moduleId/files/:fileId/download', authenticate, loadModule, requirePermission('Module', 'read'), moduleController.downloadModuleFile);
router.delete('/:moduleId/files/:fileId', authenticate, loadModule, requirePermission('Module', 'update'), moduleController.deleteModuleFile);

module.exports = router;
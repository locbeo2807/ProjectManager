const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../utils/permissions');
const upload = require('../middleware/cloudinaryUpload');
const Project = require('../models/Project');

// Middleware để tải dự án
const loadProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo dự án
router.post('/',
  authenticate,
  requirePermission('Project', 'create'),
  upload.array('overviewDocs'),
  projectController.createProject
);

// Lấy tất cả dự án
router.get('/', authenticate, requirePermission('Project', 'read'), projectController.getProjects);

// Lấy dự án đơn lẻ
router.get('/:id', authenticate, loadProject, requirePermission('Project', 'read'), projectController.getProject);

// Cập nhật dự án
router.put('/:id', authenticate, loadProject, requirePermission('Project', 'update'), upload.array('overviewDocs'), projectController.updateProject);

// Xóa dự án
router.delete('/:id', authenticate, loadProject, requirePermission('Project', 'delete'), projectController.deleteProject);

// Project file operations
router.post('/:projectId/files', authenticate, loadProject, requirePermission('Project', 'update'), upload.single('file'), projectController.uploadProjectFile);
router.get('/:projectId/files', authenticate, loadProject, requirePermission('Project', 'read'), projectController.getProjectFiles);
router.get('/:projectId/files/:fileId/download', authenticate, loadProject, requirePermission('Project', 'read'), projectController.downloadProjectFile);
router.delete('/:projectId/files/:fileId', authenticate, loadProject, requirePermission('Project', 'update'), projectController.deleteProjectFile);

module.exports = router;
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../utils/permissions');
const upload = require('../middleware/cloudinaryUpload');
const Task = require('../models/Task');
const validate = require('../middleware/validate');
const { createTaskSchema } = require('../utils/validation');

// Helper middleware: parse JSON string fields cho multipart/form-data requests
const parseTaskBodyArrays = (req, res, next) => {
  // Multer sẽ để các field trong req.body dưới dạng string khi dùng multipart/form-data
  // Chuyển các field dạng JSON string sang array/object để Joi validate và controller xử lý đúng
  const fieldsToParse = ['assignees', 'reviewers', 'acceptanceCriteria'];

  fieldsToParse.forEach((field) => {
    if (typeof req.body[field] === 'string') {
      try {
        const parsed = JSON.parse(req.body[field]);
        req.body[field] = parsed;
      } catch (e) {
        // Nếu parse lỗi, giữ nguyên string để Joi báo lỗi format cho rõ ràng
      }
    }
  });

  next();
};

// Middleware để tải nhiệm vụ
const loadTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    req.task = task;
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CRUD Nhiệm vụ
router.get('/', authenticate, requirePermission('Task', 'read'), taskController.getAllTasks); // GET all tasks
router.post(
  '/',
  authenticate,
  requirePermission('Task', 'create'),
  upload.array('docs'), // parse multipart/form-data (docs + body fields)
  parseTaskBodyArrays,  // chuyển các field JSON string thành array trước khi validate
  validate(createTaskSchema),
  taskController.createTask
); // CREATE task

// Specific routes MUST come before generic '/:id'
router.get('/by-sprint/:sprintId', authenticate, requirePermission('Task', 'read'), taskController.getTasksBySprint); // GET tasks by sprint
router.get('/navigation-info/:taskId', authenticate, taskController.getTaskNavigationInfo); // GET navigation info

// Completion files management
router.get('/:id/completion-files',
	authenticate,
	loadTask,
	requirePermission('Task', 'read', (req) => ({
		// Task schema dùng assignees/reviewers (mảng)
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.getCompletionFiles
);
router.post('/:id/completion-files',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || []
	})),
	upload.array('completionFiles'),
	taskController.uploadCompletionFiles
);
router.get('/:id/completion-files/:fileId(*)/download',
	authenticate,
	loadTask,
	requirePermission('Task', 'read', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.downloadCompletionFile
);
router.delete('/:id/completion-files/:fileId(*)',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || []
	})),
	taskController.deleteCompletionFile
);

// Cập nhật trạng thái/xem xét
router.patch('/:id/status',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.updateTaskStatus
);
router.put('/:id/review-status',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.updateTaskReviewStatus
);

// PO Acceptance route
router.put('/:id/po-acceptance',
	authenticate,
	loadTask,
	requirePermission('Task', 'update'), // PO role check will be in controller
	taskController.updatePOAcceptance
);

// Tải xuống tệp
router.get('/:id/files/:fileId(*)/download',
	authenticate,
	loadTask,
	requirePermission('Task', 'read', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.downloadTaskFile
);

// Generic routes with '/:id' at the end
router.get('/:id',
	authenticate,
	loadTask,
	requirePermission('Task', 'read', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.getTask
); // GET single task by ID
router.put('/:id',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	upload.array('docs'),
	taskController.updateTask
); // UPDATE task
router.delete('/:id', authenticate, loadTask, requirePermission('Task', 'delete'), taskController.deleteTask); // DELETE task
router.post('/:id/log-time',
	authenticate,
	loadTask,
	requirePermission('Task', 'update', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || []
	})),
	taskController.logTime
); // Log time
router.get('/:id/time-logs',
	authenticate,
	loadTask,
	requirePermission('Task', 'read', (req) => ({
		taskAssignees: req.task?.assignees?.map(id => id.toString()) || [],
		taskReviewers: req.task?.reviewers?.map(id => id.toString()) || []
	})),
	taskController.getTimeLogs
); // GET time logs

module.exports = router;

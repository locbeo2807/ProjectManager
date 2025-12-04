const express = require('express');
const router = express.Router();
const epicController = require('../controllers/epicController');
const { requirePermission } = require('../utils/permissions');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createEpicSchema, updateEpicSchema } = require('../utils/validation');

// Tất cả các route yêu cầu xác thực
router.use(authenticate);

// Tạo epic
router.post('/',
  validate(createEpicSchema),
  requirePermission('Epic', 'create'),
  epicController.createEpic
);

// Lấy epic theo dự án
router.get('/project/:projectId',
  requirePermission('Epic', 'read'),
  epicController.getEpicsByProject
);

// Lấy thống kê epic
router.get('/stats/:projectId',
  requirePermission('Epic', 'read'),
  epicController.getEpicStats
);

// Lấy epic theo ID
router.get('/:id',
  requirePermission('Epic', 'read'),
  epicController.getEpic
);

// Cập nhật epic
router.put('/:id',
  validate(updateEpicSchema),
  requirePermission('Epic', 'update'),
  epicController.updateEpic
);

// Xóa epic
router.delete('/:id',
  requirePermission('Epic', 'delete'),
  epicController.deleteEpic
);

// Thêm user story vào epic
router.post('/:epicId/add-task/:taskId',
  requirePermission('Epic', 'update'),
  epicController.addUserStoryToEpic
);

// Xóa user story khỏi epic
router.delete('/:epicId/remove-task/:taskId',
  requirePermission('Epic', 'update'),
  epicController.removeUserStoryFromEpic
);

module.exports = router;
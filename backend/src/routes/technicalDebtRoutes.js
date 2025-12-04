const express = require('express');
const router = express.Router();
const technicalDebtController = require('../controllers/technicalDebtController');
const { requirePermission } = require('../utils/permissions');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTechnicalDebtSchema, updateTechnicalDebtSchema } = require('../utils/validation');

// Tất cả các route yêu cầu xác thực
router.use(authenticate);

// Tạo nợ kỹ thuật
router.post('/',
  validate(createTechnicalDebtSchema),
  requirePermission('TechnicalDebt', 'create'),
  technicalDebtController.createTechnicalDebt
);

// Lấy nợ kỹ thuật theo dự án
router.get('/project/:projectId',
  requirePermission('TechnicalDebt', 'read'),
  technicalDebtController.getTechnicalDebtsByProject
);

// Lấy thống kê nợ kỹ thuật
router.get('/stats/:projectId',
  requirePermission('TechnicalDebt', 'read'),
  technicalDebtController.getTechnicalDebtStats
);

// Lấy nợ kỹ thuật theo ID
router.get('/:id',
  requirePermission('TechnicalDebt', 'read'),
  technicalDebtController.getTechnicalDebt
);

// Cập nhật nợ kỹ thuật
router.put('/:id',
  validate(updateTechnicalDebtSchema),
  requirePermission('TechnicalDebt', 'update'),
  technicalDebtController.updateTechnicalDebt
);

// Cập nhật trạng thái nợ kỹ thuật
router.put('/:id/status',
  requirePermission('TechnicalDebt', 'update'),
  technicalDebtController.updateTechnicalDebtStatus
);

// Xóa nợ kỹ thuật
router.delete('/:id',
  requirePermission('TechnicalDebt', 'delete'),
  technicalDebtController.deleteTechnicalDebt
);

module.exports = router;
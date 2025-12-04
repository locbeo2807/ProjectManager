const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');
const { requirePermission } = require('../utils/permissions');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRiskSchema, updateRiskSchema } = require('../utils/validation');

// Tất cả các route yêu cầu xác thực
router.use(authenticate);

// Tạo rủi ro
router.post('/',
  validate(createRiskSchema),
  requirePermission('Risk', 'create'),
  riskController.createRisk
);

// Lấy rủi ro theo dự án
router.get('/project/:projectId',
  requirePermission('Risk', 'read'),
  riskController.getRisksByProject
);

// Lấy thống kê rủi ro
router.get('/stats/:projectId',
  requirePermission('Risk', 'read'),
  riskController.getRiskStats
);

// Lấy rủi ro theo ID
router.get('/:id',
  requirePermission('Risk', 'read'),
  riskController.getRisk
);

// Cập nhật rủi ro
router.put('/:id',
  validate(updateRiskSchema),
  requirePermission('Risk', 'update'),
  riskController.updateRisk
);

// Cập nhật trạng thái rủi ro
router.put('/:id/status',
  requirePermission('Risk', 'update'),
  riskController.updateRiskStatus
);

// Xóa rủi ro
router.delete('/:id',
  requirePermission('Risk', 'delete'),
  riskController.deleteRisk
);

module.exports = router;
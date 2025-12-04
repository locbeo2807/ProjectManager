const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { requirePermission } = require('../utils/permissions');
const { authenticate } = require('../middleware/auth');

// Tất cả các route yêu cầu xác thực
router.use(authenticate);

// Chỉ số SLA
router.get('/sla/:projectId',
  requirePermission('Task', 'read'),
  metricsController.getSLAMetrics
);

// Chỉ số Năng suất Người dùng
router.get('/productivity/:userId/:projectId',
  requirePermission('Task', 'read'),
  metricsController.getUserProductivityMetrics
);

// Chỉ số Bảng điều khiển
router.get('/dashboard/:projectId',
  requirePermission('Task', 'read'),
  metricsController.getDashboardMetrics
);

// Chỉ số Hiệu suất Đội ngũ
router.get('/team-performance/:projectId',
  requirePermission('Task', 'read'),
  metricsController.getTeamPerformanceMetrics
);

// Chỉ số Chất lượng
router.get('/quality/:projectId',
  requirePermission('Task', 'read'),
  metricsController.getQualityMetrics
);

module.exports = router;
const express = require('express');
const router = express.Router();
const handoverFileService = require('../services/handoverFileService');
const { authenticate } = require('../middleware/auth');

// Upload handover files
router.post('/tasks/:taskId/handover-files', 
  authenticate, 
  handoverFileService.upload, 
  handoverFileService.uploadHandoverFiles
);

// Get handover files for a task
router.get('/tasks/:taskId/handover-files', 
  authenticate, 
  handoverFileService.getHandoverFiles
);

// Review handover files
router.patch('/tasks/:taskId/handover-files/:fileId/review', 
  authenticate, 
  handoverFileService.reviewHandoverFiles
);

// Delete handover file
router.delete('/tasks/:taskId/handover-files/:fileId', 
  authenticate, 
  handoverFileService.deleteHandoverFile
);

module.exports = router;

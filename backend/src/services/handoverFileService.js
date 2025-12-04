const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Task = require('../models/Task');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { createWorkflowNotification } = require('./notificationService');

// Configure Cloudinary storage for handover files
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'handover-files',
    resource_type: 'auto',
    allowed_formats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'],
    public_id: (req, file) => `handover_${Date.now()}_${file.originalname}`
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not allowed. Please upload PDF, Word, Excel, PowerPoint, or archive files.', 400), false);
    }
  }
}).array('handoverFiles', 5); // Maximum 5 files

/**
 * Upload handover completion files
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const uploadHandoverFiles = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;
  const { description } = req.body;
  
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one handover file', 400));
  }

  const task = await Task.findById(taskId)
    .populate('assignee reviewer handoverFrom handoverTo');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user is the current assignee or has permission
  const isAssignee = task.assignee && task.assignee._id.toString() === req.user._id.toString();
  const isReviewer = task.reviewer && task.reviewer._id.toString() === req.user._id.toString();
  const isPM = req.user.role === 'PM';
  const isBA = req.user.role === 'BA';

  if (!isAssignee && !isReviewer && !isPM && !isBA) {
    return next(new AppError('You do not have permission to upload handover files', 403));
  }

  // Process uploaded files
  const uploadedFiles = req.files.map(file => ({
    url: file.path,
    publicId: file.filename,
    fileName: file.originalname,
    fileSize: file.size,
    contentType: file.mimetype,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
    description: description || `Handover file uploaded by ${req.user.name}`,
    handoverFrom: task.assignee?._id,
    handoverTo: task.reviewer?._id,
    reviewStatus: 'Pending'
  }));

  // Add files to task
  task.handoverFiles.push(...uploadedFiles);

  // Update task status to indicate handover in progress
  if (task.status === 'Đang làm') {
    task.status = 'Đang xem xét';
  }

  // Add to history
  task.history.push({
    action: 'tải file bàn giao',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã tải ${uploadedFiles.length} file bàn giao cho task "${task.name}"`,
    isPrimary: true
  });

  await task.save();

  // Send notifications
  try {
    // Notify reviewer to review handover files
    if (task.reviewer && task.reviewer._id.toString() !== req.user._id.toString()) {
      await createWorkflowNotification('task_handover_files_uploaded', {
        taskName: task.name,
        taskId: task.taskId,
        uploaderName: req.user.name,
        fileCount: uploadedFiles.length
      }, {
        reviewerId: task.reviewer._id
      });
    }

    // Notify BA and Scrum Master
    await createWorkflowNotification('task_handover_files_uploaded', {
      taskName: task.name,
      taskId: task.taskId,
      uploaderName: req.user.name,
      fileCount: uploadedFiles.length
    }, {
      roles: ['BA', 'Scrum Master']
    });

  } catch (error) {
    console.error('Error sending handover file notifications:', error);
  }

  res.status(200).json({
    status: 'success',
    message: 'Handover files uploaded successfully',
    data: {
      files: uploadedFiles,
      task: {
        id: task._id,
        name: task.name,
        status: task.status,
        handoverFilesCount: task.handoverFiles.length
      }
    }
  });
});

/**
 * Review handover files
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const reviewHandoverFiles = catchAsync(async (req, res, next) => {
  const { taskId, fileId } = req.params;
  const { reviewStatus, reviewComment } = req.body;

  if (!['Approved', 'Rejected'].includes(reviewStatus)) {
    return next(new AppError('Invalid review status. Must be Approved or Rejected', 400));
  }

  const task = await Task.findById(taskId)
    .populate('assignee reviewer handoverFrom handoverTo');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user is the reviewer or has permission
  const isReviewer = task.reviewer && task.reviewer._id.toString() === req.user._id.toString();
  const isPM = req.user.role === 'PM';
  const isBA = req.user.role === 'BA';

  if (!isReviewer && !isPM && !isBA) {
    return next(new AppError('You do not have permission to review handover files', 403));
  }

  // Find the specific file to review
  const fileToReview = task.handoverFiles.id(fileId);
  if (!fileToReview) {
    return next(new AppError('Handover file not found', 404));
  }

  // Update file review status
  fileToReview.reviewStatus = reviewStatus;
  fileToReview.reviewedBy = req.user._id;
  fileToReview.reviewedAt = new Date();
  fileToReview.reviewComment = reviewComment || '';

  // Add to history
  task.history.push({
    action: `review file bàn giao - ${reviewStatus === 'Approved' ? 'Đạt' : 'Không đạt'}`,
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã review file "${fileToReview.fileName}" với trạng thái ${reviewStatus === 'Approved' ? 'Đạt' : 'Không đạt'}`,
    isPrimary: true
  });

  // Check if all handover files have been reviewed
  const pendingFiles = task.handoverFiles.filter(f => f.reviewStatus === 'Pending');
  const approvedFiles = task.handoverFiles.filter(f => f.reviewStatus === 'Approved');
  const rejectedFiles = task.handoverFiles.filter(f => f.reviewStatus === 'Rejected');

  // Update task status based on review results
  if (pendingFiles.length === 0) {
    if (rejectedFiles.length > 0) {
      // Some files were rejected - task needs revision
      task.status = 'Đang sửa';
      task.reviewStatus = 'Không đạt';
      
      // Send notification to assignee for revision
      if (task.assignee && task.assignee._id.toString() !== req.user._id.toString()) {
        await createWorkflowNotification('task_handover_files_rejected', {
          taskName: task.name,
          taskId: task.taskId,
          reviewerName: req.user.name,
          rejectedCount: rejectedFiles.length,
          reviewComment: reviewComment
        }, {
          assigneeId: task.assignee._id
        });
      }
    } else if (approvedFiles.length > 0) {
      // All files approved - handover completed
      task.status = 'Sẵn sàng phát hành';
      task.reviewStatus = 'Đạt';
      
      // Send notification that handover is completed
      await createWorkflowNotification('task_handover_files_approved', {
        taskName: task.name,
        taskId: task.taskId,
        reviewerName: req.user.name,
        approvedCount: approvedFiles.length
      }, {
        roles: ['PM', 'BA', 'Scrum Master']
      });
    }
  }

  await task.save();

  res.status(200).json({
    status: 'success',
    message: `Handover file reviewed as ${reviewStatus}`,
    data: {
      file: fileToReview,
      task: {
        id: task._id,
        name: task.name,
        status: task.status,
        reviewStatus: task.reviewStatus,
        handoverFilesStats: {
          total: task.handoverFiles.length,
          pending: pendingFiles.length,
          approved: approvedFiles.length,
          rejected: rejectedFiles.length
        }
      }
    }
  });
});

/**
 * Get handover files for a task
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const getHandoverFiles = catchAsync(async (req, res, next) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId)
    .populate('handoverFiles.uploadedBy', 'name email')
    .populate('handoverFiles.reviewedBy', 'name email')
    .populate('handoverFiles.handoverFrom', 'name')
    .populate('handoverFiles.handoverTo', 'name');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check permissions
  const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
  const isReviewer = task.reviewer && task.reviewer.toString() === req.user._id.toString();
  const isPM = req.user.role === 'PM';
  const isBA = req.user.role === 'BA';
  const isScrumMaster = req.user.role === 'Scrum Master';

  if (!isAssignee && !isReviewer && !isPM && !isBA && !isScrumMaster) {
    return next(new AppError('You do not have permission to view handover files', 403));
  }

  const stats = {
    total: task.handoverFiles.length,
    pending: task.handoverFiles.filter(f => f.reviewStatus === 'Pending').length,
    approved: task.handoverFiles.filter(f => f.reviewStatus === 'Approved').length,
    rejected: task.handoverFiles.filter(f => f.reviewStatus === 'Rejected').length
  };

  res.status(200).json({
    status: 'success',
    data: {
      task: {
        id: task._id,
        name: task.name,
        status: task.status,
        reviewStatus: task.reviewStatus
      },
      files: task.handoverFiles,
      stats
    }
  });
});

/**
 * Delete handover file
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const deleteHandoverFile = catchAsync(async (req, res, next) => {
  const { taskId, fileId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  // Check if user is the uploader or has permission
  const fileToDelete = task.handoverFiles.id(fileId);
  if (!fileToDelete) {
    return next(new AppError('Handover file not found', 404));
  }

  const isUploader = fileToDelete.uploadedBy.toString() === req.user._id.toString();
  const isPM = req.user.role === 'PM';
  const isBA = req.user.role === 'BA';

  if (!isUploader && !isPM && !isBA) {
    return next(new AppError('You do not have permission to delete this handover file', 403));
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(fileToDelete.publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }

  // Remove from task
  task.handoverFiles.pull(fileId);

  // Add to history
  task.history.push({
    action: 'xóa file bàn giao',
    fromUser: req.user._id,
    timestamp: new Date(),
    description: `đã xóa file "${fileToDelete.fileName}" khỏi task "${task.name}"`,
    isPrimary: true
  });

  await task.save();

  res.status(200).json({
    status: 'success',
    message: 'Handover file deleted successfully'
  });
});

module.exports = {
  upload,
  uploadHandoverFiles,
  reviewHandoverFiles,
  getHandoverFiles,
  deleteHandoverFile
};

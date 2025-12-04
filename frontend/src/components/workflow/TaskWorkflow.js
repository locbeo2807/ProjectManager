import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Grid, Card, CardContent, Typography, Avatar, Chip,
  TextField, Button, Paper, Divider, Skeleton, LinearProgress,
  Collapse, Alert, Tooltip, IconButton, List, ListItem, ListItemAvatar,
  ListItemText, ListItemSecondaryAction, Menu, MenuItem
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  RateReview as RateReviewIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  Timeline as TimelineIcon,
  GetApp as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon, Description as DescriptionIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import TaskService from '../../api/services/task.service';

const TaskWorkflow = ({ task, onTaskUpdate, readOnly }) => {
  const { user } = useAuth();

  const [files, setFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionFiles, setCompletionFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [updatingDates, setUpdatingDates] = useState(false);
  const [internalTask, setInternalTask] = useState(task);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (fileToRemove) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // Load completion files on component mount
  useEffect(() => {
    // Function to fetch full task details
    const loadInitialData = async () => {
      if (!task || !task._id) return;
      try {
        // Fetch the latest full task data
        const fullTaskData = await TaskService.getTask(task._id);
        setInternalTask(fullTaskData); // Update internal state with full data

        // Now, load completion files using the full task data
        setLoadingFiles(true);
        const filesData = await TaskService.getCompletionFiles(fullTaskData._id);
        setCompletionFiles(filesData || []);
      } catch (error) {
        console.error('Error loading initial task data:', error);
      } finally {
        setLoadingFiles(false);
      }
    };

    loadInitialData();
    // We only want this to run when the task ID changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?._id]);

  const handleSubmitForReview = async () => {
    if (files.length === 0) {
      setNotification({ open: true, message: 'Vui lòng tải lên ít nhất một tệp để hoàn thành công việc.', severity: 'warning' });
      return;
    }
    setIsSubmitting(true);
    try {
      const updatedTaskData = await TaskService.uploadCompletionFiles(internalTask._id, files, comment);
      setInternalTask(updatedTaskData.task); // Update internal state
      onTaskUpdate(updatedTaskData.task); // Notify parent component
      setNotification({ open: true, message: 'Files đã được gửi thành công để review!', severity: 'success' });
      setFiles([]);
      setComment('');
    } catch (error) {
      setNotification({
        open: true,
        message: 'Có lỗi xảy ra khi gửi file review.',
        severity: 'error'
      });
      console.error('Error submitting for review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCompletionFile = async (fileId, fileName) => {
    try {
      const blob = await TaskService.downloadCompletionFile(internalTask._id, fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      setNotification({ open: true, message: 'Không thể tải xuống file.', severity: 'error' });
    }
  };

  const handleEditDates = () => {
    setEditStartDate(internalTask.startDate ? new Date(internalTask.startDate).toISOString().split('T')[0] : '');
    setEditEndDate(internalTask.endDate ? new Date(internalTask.endDate).toISOString().split('T')[0] : '');
    setIsEditingDates(true);
  };

  const handleCancelEditDates = () => {
    setIsEditingDates(false);
    setEditStartDate('');
    setEditEndDate('');
  };

  const handleSaveDates = async () => {
    setUpdatingDates(true);
    try {
      const updateData = {
        startDate: editStartDate ? new Date(editStartDate).toISOString() : null,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
      };
      const updatedTaskData = await TaskService.updateTask(internalTask._id, updateData);
      setInternalTask(updatedTaskData); // Update internal state
      onTaskUpdate(updatedTaskData); // Notify parent component
      setIsEditingDates(false);
    } catch (error) {
      console.error('Error updating dates:', error);
      setNotification({ open: true, message: 'Có lỗi xảy ra khi cập nhật ngày tháng.', severity: 'error' });
    } finally {
      setUpdatingDates(false);
    }
  };

  const handleStatusClick = (event) => {
    if (readOnly) return;
    setStatusMenuAnchor(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === internalTask.status) {
      handleStatusMenuClose();
      return;
    }
    
    setUpdatingStatus(true);
    handleStatusMenuClose();
    
    try {
      await TaskService.updateStatus(internalTask._id, newStatus);
      // Reload task data
      const updatedTaskData = await TaskService.getTask(internalTask._id);
      setInternalTask(updatedTaskData);
      onTaskUpdate(updatedTaskData);
      setNotification({ open: true, message: `Đã cập nhật trạng thái thành "${newStatus}"`, severity: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
      setNotification({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get available next statuses based on current status
  const getAvailableStatuses = () => {
    const allStatuses = [
      'Chưa làm',
      'Đang làm', 
      'Đang xem xét',
      'Kiểm thử QA',
      'Sẵn sàng phát hành',
      'Hoàn thành',
      'Hàng đợi'
    ];
    
    // Filter based on user role and current status
    const currentStatus = internalTask.status;
    const userRole = user?.role;
    
    // Basic workflow: allow common transitions
    if (currentStatus === 'Chưa làm') {
      return ['Đang làm'];
    } else if (currentStatus === 'Đang làm') {
      return ['Đang xem xét', 'Chưa làm'];
    } else if (currentStatus === 'Đang xem xét') {
      return ['Kiểm thử QA', 'Đang làm'];
    } else if (currentStatus === 'Kiểm thử QA') {
      return ['Sẵn sàng phát hành', 'Đang làm'];
    } else if (currentStatus === 'Sẵn sàng phát hành') {
      return ['Hoàn thành'];
    } else if (currentStatus === 'Hoàn thành') {
      return []; // Cannot change from completed
    }
    
    // Default: allow all statuses for PM/BA
    if (userRole === 'PM' || userRole === 'BA') {
      return allStatuses.filter(s => s !== currentStatus);
    }
    
    return [];
  };

  const handleDeleteTask = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn task "${internalTask.name}" không? Hành động này không thể hoàn tác.`)) {
      try {
        await TaskService.deleteTask(internalTask._id);
        setNotification({ open: true, message: 'Đã xóa task thành công.', severity: 'success' });
        // Gọi onTaskUpdate để component cha có thể tải lại danh sách
        if (onTaskUpdate) {
          onTaskUpdate(null); // Gửi tín hiệu task đã bị xóa
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        setNotification({ open: true, message: 'Có lỗi xảy ra khi xóa task.', severity: 'error' });
      }
    }
  };
  const statusStyles = useMemo(() => ({
    'Chưa làm': { backgroundColor: '#e0e0e0', color: '#000' },
    'Đang làm': { backgroundColor: '#64b5f6', color: '#fff' },
    'Hoàn thành': { backgroundColor: '#81c784', color: '#fff' },
    'Đang review': { backgroundColor: '#ffb74d', color: '#000' },
  }), []);

  const canCompleteTask = !readOnly && internalTask?.assignee?._id === user?._id && internalTask?.status === 'Đang làm';

  const canDeleteTask = user?.role?.name === 'PM' || user?.role?.name === 'BA';

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0, // Sửa lỗi chính tả ở đây
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.08 // Tăng tốc độ xuất hiện của các phần tử con
      }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };  

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Chưa làm': return <ScheduleIcon />;
      case 'Đang làm': return <PlayArrowIcon />;
      case 'Hoàn thành': return <CheckCircleIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Thấp': return '#4caf50';
      case 'Trung bình': return '#ff9800';
      case 'Cao': return '#f44336';
      case 'Khẩn cấp': return '#9c27b0';
      default: return '#757575';
    }
  };

  // Wait until a valid task object is passed in
  if (!internalTask || !internalTask._id) {
    return (
      <Box p={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="text" width="60%" height={60} />
            <Skeleton variant="text" width="30%" height={30} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" width="100%" height={300} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {/* Notification System */}
      <AnimatePresence>
        {notification.open && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}
          >
            <Alert
              severity={notification.severity}
              onClose={() => setNotification({ ...notification, open: false })}
              sx={{ minWidth: 300, boxShadow: 3 }}
            >
              {notification.message}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Box sx={{ display: 'flex', height: '100%', p: { xs: 1.5, sm: 2, md: 3 }, backgroundColor: '#f9fafb' }}>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            {/* Header */}
            <motion.div variants={itemVariants}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Avatar sx={{ bgcolor: statusStyles[internalTask.status]?.backgroundColor, color: statusStyles[internalTask.status]?.color, width: 40, height: 40 }}>{getStatusIcon(internalTask.status)}</Avatar>
                  </motion.div>
                  <Typography variant="h4" fontWeight={700}>
                    {internalTask.name}
                  </Typography>
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  Task ID: {internalTask.taskId} • Sprint: {internalTask.sprint?.name || 'N/A'}
                </Typography>
              </Box>
            </motion.div>

            {/* Description Card */}
            <motion.div variants={itemVariants}>
              <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      Mô tả công việc
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {internalTask.description || 'Không có mô tả chi tiết cho công việc này.'}
                  </Typography>

                  {/* Acceptance Criteria */}
                  {internalTask.acceptanceCriteria && internalTask.acceptanceCriteria.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                        Tiêu chí chấp nhận:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        {internalTask.acceptanceCriteria.map((criteria, index) => (
                          <li key={index}>
                            <Typography variant="body2">{criteria}</Typography>
                          </li>
                        ))}
                      </Box> 
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Completion Files Section */}
            {completionFiles.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AttachFileIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h6" fontWeight={600}>
                        Files hoàn thành ({completionFiles.length})
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {loadingFiles ? (
                      <LinearProgress />
                    ) : ( 
                      <List dense>
                        <AnimatePresence>
                        {completionFiles.map((file, index) => (
                          <motion.div
                            key={file._id || index}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <ListItem
                              sx={{
                                bgcolor: 'action.hover',
                                borderRadius: 2,
                                mb: 1,
                                '&:hover': { bgcolor: 'action.selected' }
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'success.light' }}><DescriptionIcon /></Avatar>
                              </ListItemAvatar>
                              <ListItemText primary={file.fileName} secondary={`${(file.fileSize / 1024).toFixed(1)} KB`} />
                              <ListItemSecondaryAction>
                                <Tooltip title="Tải xuống">
                                  <IconButton edge="end" onClick={() => handleDownloadCompletionFile(file._id, file.fileName)}><DownloadIcon /></IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          </motion.div>
                        ))}
                        </AnimatePresence>
                      </List>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Submit for Review Section */}
            {canCompleteTask && (
              <motion.div variants={itemVariants}>
                <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <RateReviewIcon sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6" fontWeight={600}>
                        Hoàn thành & Gửi Review
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <Box
                      sx={{
                        border: `2px dashed ${isDragOver ? 'primary.main' : 'grey.300'}`,
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: isDragOver ? 'action.hover' : 'background.paper',
                        transition: 'background-color 0.3s ease, border-color 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.light',
                          backgroundColor: 'rgba(0, 123, 255, 0.02)'
                        }
                      }}
                      component="label"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <FileUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        Upload Files Hoàn Thành
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Kéo và thả file vào đây hoặc click để chọn
                      </Typography>
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                        ⚠️ Bắt buộc - Tối thiểu 1 file
                      </Typography>
                      <input type="file" multiple hidden onChange={handleFileChange} />
                    </Box>

                    <Collapse in={files.length > 0}>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Files sẽ được upload ({files.length}):
                        </Typography>
                        <List dense>
                          <AnimatePresence>
                            {files.map((file, index) => (
                              <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ListItem
                                  sx={{ bgcolor: 'action.hover', borderRadius: 2, mb: 0.5 }}
                                  secondaryAction={
                                    <Tooltip title="Xóa file">
                                      <IconButton edge="end" aria-label="delete" onClick={() => removeFile(file)}>
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  }
                                >
                                  <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'primary.light' }}><AttachFileIcon /></Avatar>
                                  </ListItemAvatar>
                                  <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
                                </ListItem>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </List>
                      </Box>
                    </Collapse>

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Mô tả công việc hoàn thành (tùy chọn)..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      sx={{ mt: 3 }}
                      variant="outlined"
                    />

                    <Button
                      variant="contained"
                      onClick={handleSubmitForReview}
                      disabled={isSubmitting || files.length === 0}
                      fullWidth
                      sx={{
                        mt: 3,
                        py: 1.2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 2
                      }}
                      endIcon={isSubmitting ? null : <SendIcon />}
                    >
                      {isSubmitting ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinearProgress color="inherit" size={20} sx={{ mr: 2, width: '80px' }} />
                          Đang gửi...
                        </Box>
                      ) : (
                        'Gửi đi để Review'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Comments & Activity */}
            <motion.div variants={itemVariants}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CommentIcon sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      Bình luận & Hoạt động
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {/* Activity Feed Placeholder */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.light', color: 'white' }}>
                        <TimelineIcon fontSize="small" />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{internalTask.createdBy?.name || 'System'}</strong> đã tạo công việc này
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {internalTask.createdAt ? new Date(internalTask.createdAt).toLocaleString('vi-VN') : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Comment Input */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar src={user?.avatar} sx={{ width: 40, height: 40 }} />
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Thêm bình luận..."
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                          }
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          endIcon={<SendIcon />}
                          sx={{ borderRadius: '8px', textTransform: 'none' }}
                        >
                          Gửi
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Enhanced Sidebar */}
          <Grid item xs={12} lg={4}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid #e0e0e0'
                }}
              >
                {/* Status Section */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(internalTask.status)}
                    <span style={{ marginLeft: 8 }}>Trạng thái</span>
                  </Typography>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Chip
                      label={internalTask.status}
                      onClick={!readOnly ? handleStatusClick : undefined}
                      sx={{
                        ...statusStyles[internalTask.status],
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        px: 1.5,
                        py: 0.5,
                        cursor: !readOnly ? 'pointer' : 'default',
                      }}
                      icon={getStatusIcon(internalTask.status)}
                      disabled={updatingStatus}
                    />
                  </motion.div>
                  
                  {/* Status Selection Menu */}
                  <Menu
                    anchorEl={statusMenuAnchor}
                    open={Boolean(statusMenuAnchor)}
                    onClose={handleStatusMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                  >
                    {getAvailableStatuses().map((status) => (
                      <MenuItem
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        selected={status === internalTask.status}
                      >
                        {status}
                      </MenuItem>
                    ))}
                    {getAvailableStatuses().length === 0 && (
                      <MenuItem disabled>Không có trạng thái nào khả dụng</MenuItem>
                    )}
                  </Menu>

                  {/* Review Status */}
                  {internalTask.reviewStatus && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Kết quả Review
                      </Typography>
                      <Chip
                        label={internalTask.reviewStatus}
                        sx={{
                          backgroundColor: internalTask.reviewStatus === 'Đạt' ? '#e8f5e8' : internalTask.reviewStatus === 'Không đạt' ? '#ffebee' : '#f5f5f5',
                          color: internalTask.reviewStatus === 'Đạt' ? '#2e7d32' : internalTask.reviewStatus === 'Không đạt' ? '#c62828' : '#666',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Details Grid */}
                <Grid container spacing={2.5}>
                  {/* Assignee */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}><AssignmentIcon fontSize="small" /></Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Người thực hiện</Typography>
                        <Typography variant="body1" fontWeight={500}>{internalTask.assignee?.name || 'Chưa gán'}</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Reviewer */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'secondary.light', width: 36, height: 36 }}><RateReviewIcon fontSize="small" /></Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Người review</Typography>
                        <Typography variant="body1" fontWeight={500}>{internalTask.reviewer?.name || 'Chưa gán'}</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Priority */}
                  {internalTask.priority && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: getPriorityColor(internalTask.priority), width: 36, height: 36 }}><TimelineIcon fontSize="small" /></Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Mức độ ưu tiên</Typography>
                          <Typography variant="body1" fontWeight={500}>{internalTask.priority}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

                  {/* Dates Section */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'info.light', width: 36, height: 36 }}><CalendarTodayIcon fontSize="small" /></Avatar>
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Thời gian</Typography>
                        {!readOnly && !isEditingDates && (
                          <Button
                            startIcon={<EditIcon />}
                            onClick={handleEditDates}
                            size="small"
                            variant="text"
                            sx={{ p: 0.5, minWidth: 'auto', textTransform: 'none' }}
                          >
                            Sửa
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {isEditingDates ? (
                    <Grid item xs={12}>
                      <AnimatePresence>
                        <motion.div
                          key="date-editor"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <Box sx={{ pl: '52px', pt: 1 }}> {/* Indent to align with text */}
                            <Grid container spacing={1.5}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="date"
                                  label="Bắt đầu"
                                  value={editStartDate}
                                  onChange={(e) => setEditStartDate(e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="date"
                                  label="Kết thúc"
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                              <Button onClick={handleCancelEditDates} disabled={updatingDates} size="small" startIcon={<CancelIcon />}>
                                Hủy
                              </Button>
                              <Button
                                onClick={handleSaveDates}
                                disabled={updatingDates}
                                variant="contained" size="small"
                                startIcon={!updatingDates ? <SaveIcon /> : null}>
                                {updatingDates ? 'Đang lưu...' : 'Lưu'}
                              </Button>
                            </Box>
                          </Box>
                        </motion.div>
                      </AnimatePresence>
                    </Grid>
                  ) : (
                    <Grid item xs={12}>
                      <Box sx={{ pl: '52px' }}> {/* Indent to align with text */}
                        {['startDate', 'endDate'].map(dateType => (
                          <Typography key={dateType} variant="body2" sx={{ mb: 0.5 }}>
                            <strong>{dateType === 'startDate' ? 'Bắt đầu' : 'Kết thúc'}:</strong> {internalTask[dateType] ? new Date(internalTask[dateType]).toLocaleDateString('vi-VN') : 'N/A'}
                          </Typography>
                        ))}
                        {Number(internalTask.actualHours) > 0 && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Thời gian thực:</strong> {internalTask.actualHours}h
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  )}

                  {/* Task Details */}
                  {(internalTask.storyPoints || internalTask.estimatedHours) && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'grey.500', width: 36, height: 36 }}><AssignmentIcon fontSize="small" /></Avatar>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Chi tiết</Typography>
                          {internalTask.storyPoints && (
                            <Typography variant="body2" component="span" fontWeight={500}>
                              {internalTask.storyPoints} SPs
                            </Typography>
                          )}
                          {internalTask.storyPoints && internalTask.estimatedHours && ' • '}
                          {internalTask.estimatedHours && (
                            <Typography variant="body2" component="span" fontWeight={500}>
                              {internalTask.estimatedHours}h dự kiến
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* Admin Actions */}
                {canDeleteTask && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <motion.div variants={itemVariants}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Hành động Quản trị
                      </Typography>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteTask}
                      >
                        Xóa Task này
                      </Button>
                    </motion.div>
                  </>
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default TaskWorkflow;

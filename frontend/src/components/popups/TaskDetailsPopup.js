import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
  TextField
} from '@mui/material';
import {
  Close,
  Schedule,
  Flag,
  AttachFile,
  CheckCircle,
  Pending,
  Download,
  BugReport,
  Code,
  Build,
  Search,
  PlayArrow,
  Pause,
  Timer
} from '@mui/icons-material';
import TaskService from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './TaskDetailsPopup.module.css';

const TaskDetailsPopup = ({ open, onClose, task, onUpdate, initialTab = 0 }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [reviewing, setReviewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isTimerRestored, setIsTimerRestored] = useState(false);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewDescription, setReviewDescription] = useState('');
  const [uploadingReview, setUploadingReview] = useState(false);
  const fileInputRef = useRef(null);

  const fetchTaskDetails = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const details = await TaskService.getTask(task._id);
      setTaskDetails(details);
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (task && open) {
      setActiveTab(initialTab);
      fetchTaskDetails();
    }
  }, [task, open, initialTab, fetchTaskDetails]);

  const currentTask = taskDetails || task;

  // Timer đơn giản sử dụng localStorage và tính toán thời gian thực
  useEffect(() => {
    if (!isTimerRunning || !currentTask.taskId) return;

    let animationFrameId;
    
    const updateTimer = () => {
      const stored = localStorage.getItem(`timer_${currentTask.taskId}`);
      if (stored) {
        const timerData = JSON.parse(stored);
        const currentTimeLeft = Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000));
        
        setTimeLeft(currentTimeLeft);
        
        if (currentTimeLeft <= 0) {
          setIsTimerRunning(false);
          setIsTimerRestored(false);
          localStorage.removeItem(`timer_${currentTask.taskId}`);
          
          // Hiển thị thông báo
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Timeout', {
              body: `Time's up for task ${currentTask.taskId}!`,
              icon: '/icon.png'
            });
          }
        } else {
          animationFrameId = requestAnimationFrame(updateTimer);
        }
      } else {
        // Timer bị xóa từ bên ngoài
        setIsTimerRunning(false);
        setIsTimerRestored(false);
        setTimeLeft(0);
      }
    };
    
    animationFrameId = requestAnimationFrame(updateTimer);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isTimerRunning, currentTask.taskId]);

  // Kiểm tra timer tồn tại khi component mount hoặc khi popup mở
  useEffect(() => {
    if (currentTask.taskId) {
      const stored = localStorage.getItem(`timer_${currentTask.taskId}`);
      if (stored) {
        const timerData = JSON.parse(stored);
        const timeRemaining = Math.max(0, Math.floor((timerData.endTime - Date.now()) / 1000));
        
        if (timeRemaining > 0) {
          setTimeLeft(timeRemaining);
          setIsTimerRunning(true);
          setIsTimerRestored(true);
          console.log('Timer restored from localStorage:', timeRemaining);
        } else {
          // Dọn dẹp timer hết hạn
          localStorage.removeItem(`timer_${currentTask.taskId}`);
          setTimeLeft(0);
          setIsTimerRunning(false);
          setIsTimerRestored(false);
        }
      } else {
        setIsTimerRestored(false);
      }
    }
  }, [currentTask.taskId, open]); // Thêm 'open' để kích hoạt khi popup mở

  // Tự động bắt đầu timer khi task có trạng thái "Đang làm" hoặc khi đến ngày bắt đầu
  useEffect(() => {
    // Thêm một chút độ trễ để đảm bảo logic khôi phục chạy trước
    const timer = setTimeout(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startDate = currentTask.startDate ? new Date(currentTask.startDate) : null;
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
      }
      
      const shouldAutoStart = (
        (currentTask.status === 'Đang làm' || (startDate && startDate <= today)) && 
        !isTimerRunning &&
        !isTimerRestored // Không tự động bắt đầu nếu timer đã được khôi phục
      );
      
      if (shouldAutoStart) {
        console.log('Auto-starting timer for task - status:', currentTask.status);
        const estimatedHours = currentTask.estimatedHours || 24;
        const duration = estimatedHours * 3600;
        const endTime = Date.now() + duration * 1000;
        
        // Lưu vào localStorage với đầy đủ dữ liệu timer
        const timerData = {
          endTime: endTime,
          startTime: Date.now(),
          duration: duration
        };
        localStorage.setItem(`timer_${currentTask.taskId}`, JSON.stringify(timerData));
        
        setTimeLeft(duration);
        setIsTimerRunning(true);
        setIsTimerRestored(false);
        toast.info(`Tự động bắt đầu đếm ngược cho task "${currentTask.name}"`);
      }
    }, 100); // 100ms độ trễ
    
    return () => clearTimeout(timer);
  }, [currentTask.status, currentTask.taskId, currentTask.estimatedHours, currentTask.name, currentTask.startDate, isTimerRunning, isTimerRestored]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Hàng đợi': '#f1f3f5',
      'Chưa làm': '#e3f2fd',
      'Đang làm': '#fff3cd',
      'Đang xem xét': '#f8d7da',
      'Kiểm thử QA': '#d1ecf1',
      'Sẵn sàng phát hành': '#d4edda',
      'Hoàn thành': '#e6f4ea'
    };
    return colors[status] || '#f1f3f5';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Thấp': '#28a745',
      'Trung bình': '#ffc107',
      'Cao': '#fd7e14',
      'Khẩn cấp': '#dc3545'
    };
    return colors[priority] || '#6c757d';
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'Bug': return <BugReport />;
      case 'Feature': return <Code />;
      case 'Improvement': return <Build />;
      default: return <Search />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Chưa có';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadFile = async (file, isCompletion = false) => {
    if (!task || !task._id) return;
    try {
      // Gọi đúng API backend để đảm bảo header Content-Disposition dùng tên gốc (có đuôi .pdf, .docx, ...)
      const blob = isCompletion
        ? await TaskService.downloadCompletionFile(task._id, file.publicId)
        : await TaskService.downloadTaskFile(task._id, file.publicId);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file from TaskDetailsPopup:', error);
      toast.error('Không thể tải xuống file. Vui lòng thử lại sau.');
    }
  };

  // Return sớm sau khi tất cả hooks được định nghĩa
  if (!taskDetails && !loading) return null;

  const toggleTimer = () => {
    if (!isTimerRunning) {
      const estimatedHours = currentTask.estimatedHours || 24;
      const duration = estimatedHours * 3600;
      const endTime = Date.now() + duration * 1000;
      
      // Lưu vào localStorage với thời gian bắt đầu
      const timerData = {
        endTime: endTime,
        startTime: Date.now(),
        duration: duration
      };
      localStorage.setItem(`timer_${currentTask.taskId}`, JSON.stringify(timerData));
      
      setTimeLeft(duration);
      setIsTimerRunning(true);
      setIsTimerRestored(false);
      toast.success(`Bắt đầu đếm ngược ${estimatedHours} giờ`);
    } else {
      // Dừng timer
      localStorage.removeItem(`timer_${currentTask.taskId}`);
      
      setTimeLeft(0);
      setIsTimerRunning(false);
      setIsTimerRestored(false);
      toast.info('Đã dừng bộ đếm thời gian');
    }
  };

  const isReviewerUser = Array.isArray(currentTask.reviewers) && user
    ? currentTask.reviewers.some(r => r && r._id === user._id)
    : false;

  const canReview = !!user && currentTask.status === 'Đang xem xét' && (isReviewerUser || user.role === 'PM' || user.role === 'BA');

  const handleReview = async (result) => {
    if (!currentTask || !currentTask._id) return;
    setReviewing(true);
    try {
      await TaskService.updateTaskReviewStatus(currentTask._id, {
        reviewStatus: result,
      });
      const updated = await TaskService.getTask(currentTask._id);
      setTaskDetails(updated);
      if (onUpdate) onUpdate(updated);
      // Thông báo cho người dùng biết kết quả
      if (result === 'Đạt') {
        toast.success('Đã đánh giá task Đạt.');
      } else if (result === 'Không đạt') {
        toast.success('Đã đánh giá task Không đạt.');
      }
    } catch (error) {
      console.error('Error updating review status from TaskDetailsPopup:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đánh giá.';
      toast.error(msg);
    } finally {
      setReviewing(false);
    }
  };

  // Hàm xử lý upload file review để chuyển status task
  const handleUploadReviewFiles = async () => {
    if (!currentTask || !currentTask._id) return;
    if (reviewFiles.length === 0) {
      toast.error('Vui lòng chọn ít nhất một file review.');
      return;
    }

    setUploadingReview(true);
    try {
      // Upload file review
      await TaskService.uploadCompletionFiles(currentTask._id, reviewFiles, reviewDescription);
      
      // Cập nhật status task từ "Đang làm" sang "Đang xem xét"
      const updated = await TaskService.updateTask(currentTask._id, {
        status: 'Đang xem xét'
      });

      setTaskDetails(updated);
      if (onUpdate) onUpdate(updated);

      // Reset form
      setReviewFiles([]);
      setReviewDescription('');
      
      toast.success('Đã nộp file review và chuyển task sang trạng thái chờ đánh giá.');
    } catch (error) {
      console.error('Error uploading review files:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi nộp file review.';
      toast.error(msg);
    } finally {
      setUploadingReview(false);
    }
  };

  // Hàm xử lý chọn file review
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setReviewFiles(files);
  };

  // Hàm xử lý xóa file review
  const handleRemoveFile = (index) => {
    const newFiles = [...reviewFiles];
    newFiles.splice(index, 1);
    setReviewFiles(newFiles);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ className: styles.dialog }}
    >
      <DialogTitle className={styles.dialogTitle}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Box display="flex" alignItems="center" gap={2}>
            {getTaskTypeIcon(currentTask.taskType)}
            <Box>
              <Typography variant="h6" className={styles.taskTitle}>
                {currentTask.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                #{currentTask.taskId}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={currentTask.status}
              style={{
                backgroundColor: getStatusColor(currentTask.status),
                color: getStatusColor(currentTask.status) === '#f1f3f5' ? '#6c757d' : '#000'
              }}
              size="small"
            />
            <Chip
              label={currentTask.priority}
              style={{
                backgroundColor: getPriorityColor(currentTask.priority),
                color: 'white'
              }}
              size="small"
              icon={<Flag />}
            />
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Chi tiết" />
            <Tab label="Lịch sử" />
            <Tab label="Files" />
            <Tab label="Thời gian" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box className={styles.tabContent}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={8}>
                <Card className={styles.infoCard}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Thông tin cơ bản
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Loại task</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getTaskTypeIcon(currentTask.taskType)}
                          <Typography>{currentTask.taskType}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Story Points</Typography>
                        <Typography>{currentTask.storyPoints || 0}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Thời gian dự kiến</Typography>
                        <Typography>{currentTask.estimatedHours || 0}h</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Thời gian thực tế</Typography>
                        <Typography>{currentTask.actualHours || 0}h</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Ngày bắt đầu</Typography>
                        <Typography>{formatDate(currentTask.startDate)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="textSecondary">Ngày kết thúc</Typography>
                        <Typography>{formatDate(currentTask.endDate)}</Typography>
                      </Grid>
                    </Grid>

                    {currentTask.goal && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="textSecondary">Mục tiêu</Typography>
                        <Typography variant="body1">{currentTask.goal}</Typography>
                      </>
                    )}

                    {currentTask.description && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="textSecondary">Mô tả</Typography>
                        <Typography variant="body1">{currentTask.description}</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Assignees & Reviewers */}
              <Grid item xs={12} md={4}>
                <Card className={styles.infoCard}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Người thực hiện
                    </Typography>
                    {currentTask.assignees && currentTask.assignees.length > 0 ? (
                      <List dense>
                        {currentTask.assignees.map((assignee) => (
                          <ListItem key={assignee._id}>
                            <ListItemAvatar>
                              <Avatar>{assignee.name.charAt(0)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={assignee.name} secondary={assignee.email} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="textSecondary">Chưa phân công</Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Người đánh giá
                    </Typography>
                    {currentTask.reviewers && currentTask.reviewers.length > 0 ? (
                      <List dense>
                        {currentTask.reviewers.map((reviewer) => (
                          <ListItem key={reviewer._id}>
                            <ListItemAvatar>
                              <Avatar>{reviewer.name.charAt(0)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={reviewer.name} secondary={reviewer.email} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="textSecondary">Chưa phân công</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Acceptance Criteria */}
              {currentTask.acceptanceCriteria && currentTask.acceptanceCriteria.length > 0 && (
                <Grid item xs={12}>
                  <Card className={styles.infoCard}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Tiêu chí chấp nhận
                      </Typography>
                      <List>
                        {currentTask.acceptanceCriteria.map((criteria, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={criteria} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Business Workflow Status */}
              {currentTask.taskType === 'Feature' && currentTask.businessWorkflow && (
                <Grid item xs={12}>
                  <Card className={styles.infoCard}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Quy trình nghiệp vụ
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {currentTask.businessWorkflow.baConfirmRequirement ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Pending color="warning" />
                            )}
                            <Typography variant="body2">
                              BA Confirm Requirements
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {currentTask.businessWorkflow.baApproveUI ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Pending color="warning" />
                            )}
                            <Typography variant="body2">
                              BA Approve UI/UX
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {currentTask.businessWorkflow.baAcceptFeature ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Pending color="warning" />
                            )}
                            <Typography variant="body2">
                              BA Accept Feature
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {currentTask.businessWorkflow.poAcceptFeature ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Pending color="warning" />
                            )}
                            <Typography variant="body2">
                              PO Final Acceptance
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* Upload Review Files cho Dev */}
            {user && currentTask.status === 'Đang làm' && 
             currentTask.assignees && currentTask.assignees.some(a => a._id === user._id) && (
              <Box sx={{ mt: 3, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Nộp file review để hoàn thành task
                </Typography>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                />
                
                <Button
                  variant="outlined"
                  startIcon={<AttachFile />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ mb: 2 }}
                >
                  Chọn file review
                </Button>

                {reviewFiles.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Files đã chọn:
                    </Typography>
                    {reviewFiles.map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Typography>
                        <IconButton size="small" onClick={() => handleRemoveFile(index)}>
                          <Close />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Mô tả công việc đã hoàn thành"
                  value={reviewDescription}
                  onChange={(e) => setReviewDescription(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUploadReviewFiles}
                  disabled={uploadingReview || reviewFiles.length === 0}
                  fullWidth
                >
                  {uploadingReview ? 'Đang nộp...' : 'Nộp file review'}
                </Button>
              </Box>
            )}

            {canReview && currentTask.completionFiles && currentTask.completionFiles.length > 0 && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleReview('Đạt')}
                  disabled={reviewing}
                >
                  Đạt
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleReview('Không đạt')}
                  disabled={reviewing}
                >
                  Không đạt
                </Button>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box className={styles.tabContent}>
            <Card className={styles.infoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Lịch sử hoạt động
                </Typography>
                <List>
                  {currentTask.history && currentTask.history
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((item, index) => (
                      <ListItem key={index} alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar>{item.fromUser?.name?.charAt(0) || '?'}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={item.description}
                          secondary={`${item.fromUser?.name || 'Unknown'} - ${formatDate(item.timestamp)}`}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 2 && (
          <Box className={styles.tabContent}>
            <Grid container spacing={3}>
              {/* Regular Files */}
              {currentTask.docs && currentTask.docs.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Card className={styles.infoCard}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Files đính kèm
                      </Typography>
                      <List>
                        {currentTask.docs.map((file, index) => (
                          <ListItem key={index}>
                            <ListItemAvatar>
                              <Avatar>
                                <AttachFile />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={file.fileName}
                              secondary={formatFileSize(file.fileSize)}
                            />
                            <IconButton onClick={() => handleDownloadFile(file, false)}>
                              <Download />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Completion Files */}
              {currentTask.completionFiles && currentTask.completionFiles.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Card className={styles.infoCard}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Files hoàn thành
                      </Typography>
                      <List>
                        {currentTask.completionFiles.map((file, index) => (
                          <ListItem key={index}>
                            <ListItemAvatar>
                              <Avatar>
                                <CheckCircle color="success" />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={file.fileName}
                              secondary={`${formatFileSize(file.fileSize)} - ${file.description || 'File hoàn thành'}`}
                            />
                            <IconButton onClick={() => handleDownloadFile(file, true)}>
                              <Download />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {activeTab === 3 && (
          <Box className={styles.tabContent}>
            <Card className={styles.infoCard}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Theo dõi thời gian
                </Typography>

                <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Timer color="primary" />
                      <Typography variant="h6">Bộ đếm thời gian</Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color={isTimerRunning ? 'secondary' : 'primary'}
                      startIcon={isTimerRunning ? <Pause /> : <PlayArrow />}
                      onClick={toggleTimer}
                    >
                      {isTimerRunning ? 'Dừng' : 'Bắt đầu'}
                    </Button>
                  </Box>

                  <Box textAlign="center" my={3}>
                    <Typography variant="h3" component="div" color="primary">
                      {formatTime(timeLeft || currentTask.estimatedHours * 3600)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Thời gian còn lại
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Tiến độ thời gian
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={currentTask.estimatedHours > 0 ? 
                        Math.min(((currentTask.estimatedHours * 3600 - (timeLeft || currentTask.estimatedHours * 3600)) / 
                        (currentTask.estimatedHours * 3600)) * 100, 100) : 0}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        Đã qua: {formatTime(currentTask.estimatedHours * 3600 - (timeLeft || currentTask.estimatedHours * 3600))}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Còn lại: {formatTime(timeLeft || currentTask.estimatedHours * 3600)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Tiến độ thời gian
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={currentTask.estimatedHours > 0 ?
                      Math.min((currentTask.actualHours / currentTask.estimatedHours) * 100, 100) : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {currentTask.actualHours || 0}h / {currentTask.estimatedHours || 0}h
                  </Typography>
                </Box>

                {currentTask.timeLogs && currentTask.timeLogs.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      Nhật ký thời gian
                    </Typography>
                    <List>
                      {currentTask.timeLogs.map((log, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar>
                              <Schedule />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={`${log.hours}h - ${log.description || 'Không có mô tả'}`}
                            secondary={`${log.loggedBy?.name || 'Unknown'} - ${formatDate(log.date)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions className={styles.dialogActions}>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailsPopup;

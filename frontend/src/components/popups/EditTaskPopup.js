import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Grid,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Close,
  Save,
  Assignment,
  Flag
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotify } from '../../hooks/useNotify';
import TaskService from '../../services/taskService';
import styles from './EditTaskPopup.module.css';

const EditTaskPopup = ({ open, onClose, task, onUpdate, sprint, project }) => {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    taskType: 'Feature',
    priority: 'Trung bình',
    status: 'Hàng đợi',
    assignee: '',
    reviewer: '',
    storyPoints: '',
    estimatedHours: '',
    actualHours: '',
    startDate: null,
    endDate: null,
    deadline: null,
    description: '',
    acceptanceCriteria: []
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [newCriterion, setNewCriterion] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        goal: task.goal || '',
        taskType: task.taskType || 'Feature',
        priority: task.priority || 'Trung bình',
        status: task.status || 'Hàng đợi',
        assignee: task.assignee?._id || '',
        reviewer: task.reviewer?._id || '',
        storyPoints: task.storyPoints || '',
        estimatedHours: task.estimatedHours || '',
        actualHours: task.actualHours || '',
        startDate: task.startDate ? new Date(task.startDate) : null,
        endDate: task.endDate ? new Date(task.endDate) : null,
        deadline: task.deadline ? new Date(task.deadline) : null,
        description: task.description || '',
        acceptanceCriteria: task.acceptanceCriteria || []
      });
    }
    fetchAvailableUsers();
  }, [task]);

  const fetchAvailableUsers = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockUsers = [
        { _id: '1', name: 'Nguyễn Văn A', email: 'a@example.com', role: 'Developer' },
        { _id: '2', name: 'Trần Thị B', email: 'b@example.com', role: 'Developer' },
        { _id: '3', name: 'Lê Văn C', email: 'c@example.com', role: 'QA Tester' },
        { _id: '4', name: 'Phạm Thị D', email: 'd@example.com', role: 'Developer' }
      ];
      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setFormData(prev => ({
        ...prev,
        acceptanceCriteria: [...prev.acceptanceCriteria, newCriterion.trim()]
      }));
      setNewCriterion('');
    }
  };

  const handleRemoveCriterion = (index) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      notify.warning('Vui lòng nhập tên task', 'Validation Error');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        startDate: formData.startDate,
        endDate: formData.endDate,
        deadline: formData.deadline
      };

      const updatedTask = await TaskService.updateTask(task._id, updateData);
      
      notify.success('Task đã được cập nhật thành công', 'Update Successful');
      onUpdate(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      notify.error(`Cập nhật task thất bại: ${error.message || 'Lỗi không xác định'}`, 'Update Failed');
    } finally {
      setLoading(false);
    }
  };

  const taskTypes = ['Feature', 'Bug', 'Improvement', 'Research/Spike'];
  const priorities = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
  const statuses = ['Hàng đợi', 'Chưa làm', 'Đang làm', 'Đang xem xét', 'Kiểm thử QA', 'Sẵn sàng phát hành', 'Hoàn thành'];

  const getPriorityColor = (priority) => {
    const colors = {
      'Thấp': '#28a745',
      'Trung bình': '#ffc107',
      'Cao': '#fd7e14',
      'Khẩn cấp': '#dc3545'
    };
    return colors[priority] || '#6c757d';
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ className: styles.dialog }}>
      <DialogTitle className={styles.dialogTitle}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Assignment />
            <Typography variant="h6">Chỉnh sửa Task</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent className={styles.dialogContent}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" className={styles.sectionTitle}>
                Thông tin cơ bản
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tên Task"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                className={styles.textField}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth className={styles.formControl}>
                <InputLabel>Loại Task</InputLabel>
                <Select
                  value={formData.taskType}
                  onChange={(e) => handleChange('taskType', e.target.value)}
                  label="Loại Task"
                >
                  {taskTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mục tiêu"
                value={formData.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                className={styles.textField}
              />
            </Grid>

            {/* Assignment */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" className={styles.sectionTitle}>
                Phân công
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth className={styles.formControl}>
                <InputLabel>Người thực hiện</InputLabel>
                <Select
                  value={formData.assignee}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                  label="Người thực hiện"
                >
                  <MenuItem value="">Chưa phân công</MenuItem>
                  {availableUsers.map(user => (
                    <MenuItem key={user._id} value={user._id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar size="small">{user.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2">{user.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{user.role}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth className={styles.formControl}>
                <InputLabel>Người xem xét</InputLabel>
                <Select
                  value={formData.reviewer}
                  onChange={(e) => handleChange('reviewer', e.target.value)}
                  label="Người xem xét"
                >
                  <MenuItem value="">Chưa phân công</MenuItem>
                  {availableUsers.map(user => (
                    <MenuItem key={user._id} value={user._id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar size="small">{user.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2">{user.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{user.role}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Status and Priority */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" className={styles.sectionTitle}>
                Trạng thái và Mức độ ưu tiên
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth className={styles.formControl}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="Trạng thái"
                >
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box 
                          width={12} 
                          height={12} 
                          borderRadius="50%" 
                          bgcolor={getStatusColor(status)}
                        />
                        {status}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth className={styles.formControl}>
                <InputLabel>Mức độ ưu tiên</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  label="Mức độ ưu tiên"
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority} value={priority}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Flag style={{ color: getPriorityColor(priority) }} />
                        {priority}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Time Tracking */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" className={styles.sectionTitle}>
                Thời gian
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Story Points"
                type="number"
                value={formData.storyPoints}
                onChange={(e) => handleChange('storyPoints', e.target.value)}
                className={styles.textField}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giờ dự kiến"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', e.target.value)}
                className={styles.textField}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Giờ thực tế"
                type="number"
                value={formData.actualHours}
                onChange={(e) => handleChange('actualHours', e.target.value)}
                className={styles.textField}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Deadline"
                  value={formData.deadline}
                  onChange={(newValue) => handleChange('deadline', newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth className={styles.textField} />}
                />
              </LocalizationProvider>
            </Grid>

            {/* Acceptance Criteria */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" className={styles.sectionTitle}>
                Tiêu chí chấp nhận
              </Typography>
              
              <Box className={styles.acceptanceCriteria}>
                {formData.acceptanceCriteria.map((criterion, index) => (
                  <Chip
                    key={index}
                    label={criterion}
                    onDelete={() => handleRemoveCriterion(index)}
                    className={styles.criterionChip}
                  />
                ))}
                
                <Box display="flex" gap={1} mt={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Thêm tiêu chí"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
                    className={styles.textField}
                  />
                  <Button onClick={handleAddCriterion} variant="outlined" size="small">
                    Thêm
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions className={styles.dialogActions}>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? null : <Save />}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTaskPopup;

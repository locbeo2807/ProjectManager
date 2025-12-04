import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Autocomplete
} from '@mui/material';
import { epicService } from '../../api/services/epic.service';
import { taskService } from '../../api/services/task.service';

const EditEpicPopup = ({ open, epic, onClose, onEpicUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Trung bình',
    status: 'Backlog',
    assignee: '',
    acceptanceCriteria: ['']
  });
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [errors, setErrors] = useState({});

  const priorities = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
  const statuses = ['Hàng đợi', 'Đang làm', 'Hoàn thành'];

  useEffect(() => {
    if (open && epic) {
      setFormData({
        title: epic.title || '',
        description: epic.description || '',
        priority: epic.priority || 'Trung bình',
        status: epic.status || 'Backlog',
        assignee: epic.assignee?._id || '',
        acceptanceCriteria: epic.acceptanceCriteria || ['']
      });
      setSelectedTasks(epic.userStories || []);
      setErrors({});

      // Fetch available tasks for this project
      fetchAvailableTasks();
    }
  }, [open, epic]);

  const fetchAvailableTasks = useCallback(async () => {
    if (!epic?.project) return;

    try {
      const tasks = await taskService.getTasksByProject(epic.project);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [epic?.project]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAcceptanceCriteriaChange = (index, value) => {
    const newCriteria = [...formData.acceptanceCriteria];
    newCriteria[index] = value;
    setFormData(prev => ({ ...prev, acceptanceCriteria: newCriteria }));
  };

  const addAcceptanceCriteria = () => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, '']
    }));
  };

  const removeAcceptanceCriteria = (index) => {
    if (formData.acceptanceCriteria.length > 1) {
      const newCriteria = formData.acceptanceCriteria.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, acceptanceCriteria: newCriteria }));
    }
  };

  const handleTaskSelection = async (taskId, selected) => {
    try {
      if (selected) {
        await epicService.addTaskToEpic(epic._id, taskId);
        const task = availableTasks.find(t => t._id === taskId);
        setSelectedTasks(prev => [...prev, task]);
      } else {
        await epicService.removeTaskFromEpic(epic._id, taskId);
        setSelectedTasks(prev => prev.filter(t => t._id !== taskId));
      }
    } catch (error) {
      console.error('Failed to update epic tasks:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề epic là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả epic là bắt buộc';
    }

    const validCriteria = formData.acceptanceCriteria.filter(c => c.trim());
    if (validCriteria.length === 0) {
      newErrors.acceptanceCriteria = 'Ít nhất một tiêu chí chấp nhận là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const epicData = {
        ...formData,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim())
      };

      const updatedEpic = await epicService.updateEpic(epic._id, epicData);
      onEpicUpdated(updatedEpic);
    } catch (error) {
      console.error('Failed to update epic:', error);
      setErrors({ submit: error.response?.data?.message || 'Không thể cập nhật epic' });
    } finally {
      setLoading(false);
    }
  };

  if (!epic) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Chỉnh sửa Epic: {epic.title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Tiêu đề Epic"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Mô tả Epic"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={!!errors.description}
            helperText={errors.description}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Mức độ ưu tiên</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                label="Mức độ ưu tiên"
              >
                {priorities.map(priority => (
                  <MenuItem key={priority} value={priority}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={priority}
                        size="small"
                        sx={{
                          backgroundColor:
                            priority === 'Khẩn cấp' ? '#dc3545' :
                            priority === 'Cao' ? '#fd7e14' :
                            priority === 'Trung bình' ? '#ffc107' :
                            '#28a745',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                label="Trạng thái"
              >
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    <Chip
                      label={status}
                      size="small"
                      sx={{
                        backgroundColor:
                          status === 'Hoàn thành' ? '#28a745' :
                          status === 'Đang làm' ? '#007bff' :
                          status === 'Hàng đợi' ? '#6c757d' :
                          '#6c757d',
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Tiêu chí chấp nhận
            </Typography>
            {formData.acceptanceCriteria.map((criteria, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  placeholder={`Tiêu chí ${index + 1}`}
                  value={criteria}
                  onChange={(e) => handleAcceptanceCriteriaChange(index, e.target.value)}
                  size="small"
                />
                {formData.acceptanceCriteria.length > 1 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => removeAcceptanceCriteria(index)}
                  >
                    Xóa
                  </Button>
                )}
              </Box>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={addAcceptanceCriteria}
              sx={{ mt: 1 }}
            >
              + Thêm tiêu chí
            </Button>
            {errors.acceptanceCriteria && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {errors.acceptanceCriteria}
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Liên kết User Stories
            </Typography>
            <Autocomplete
              multiple
              options={availableTasks}
              value={selectedTasks}
              onChange={(event, newValue) => {
                // Handle selection changes
                const added = newValue.filter(task => !selectedTasks.find(t => t._id === task._id));
                const removed = selectedTasks.filter(task => !newValue.find(t => t._id === task._id));

                added.forEach(task => handleTaskSelection(task._id, true));
                removed.forEach(task => handleTaskSelection(task._id, false));
              }}
              getOptionLabel={(option) => option.taskId ? `${option.taskId}: ${option.name}` : option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Chọn user stories để liên kết với epic"
                  size="small"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option._id}
                    label={option.taskId || option.name}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Box>

          {errors.submit && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {errors.submit}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Đang cập nhật...' : 'Cập nhật Epic'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditEpicPopup;

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Autocomplete
} from '@mui/material';
import { riskService } from '../../api/services/risk.service';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../api/services/task.service';

const NewRiskPopup = ({ open, onClose, projectId, onRiskCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    impact: 'Medium',
    likelihood: 'Medium',
    mitigationPlan: '',
    assignedTo: '',
    task: '',
    module: ''
  });
  const [errors, setErrors] = useState({});

  const impacts = ['Low', 'Medium', 'High', 'Critical'];
  const likelihoods = ['Low', 'Medium', 'High', 'Very High'];

  const fetchAvailableTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      const tasks = await taskService.getTasksByProject(projectId);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        impact: 'Medium',
        likelihood: 'Medium',
        mitigationPlan: '',
        assignedTo: user._id,
        task: '',
        module: ''
      });
      setErrors({});

      // Fetch available tasks để linking
      fetchAvailableTasks();
    }
  }, [open, user._id, fetchAvailableTasks]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculatePriority = (impact, likelihood) => {
    const matrix = {
      'Critical-Very High': 'Critical',
      'Critical-High': 'Critical',
      'Critical-Medium': 'High',
      'Critical-Low': 'High',
      'High-Very High': 'Critical',
      'High-High': 'High',
      'High-Medium': 'High',
      'High-Low': 'Medium',
      'Medium-Very High': 'High',
      'Medium-High': 'High',
      'Medium-Medium': 'Medium',
      'Medium-Low': 'Low',
      'Low-Very High': 'High',
      'Low-High': 'Medium',
      'Low-Medium': 'Low',
      'Low-Low': 'Low'
    };

    return matrix[`${impact}-${likelihood}`] || 'Medium';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề rủi ro là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả rủi ro là bắt buộc';
    }

    if (!formData.mitigationPlan.trim()) {
      newErrors.mitigationPlan = 'Kế hoạch giảm thiểu là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const riskData = {
        ...formData,
        project: projectId,
        priority: calculatePriority(formData.impact, formData.likelihood)
      };

      const newRisk = await riskService.createRisk(riskData);
      onRiskCreated(newRisk);
    } catch (error) {
      console.error('Failed to create risk:', error);
      setErrors({ submit: error.response?.data?.message || 'Không thể tạo rủi ro' });
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getLikelihoodColor = (likelihood) => {
    switch (likelihood) {
      case 'Very High': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const priority = calculatePriority(formData.impact, formData.likelihood);
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Thêm Rủi ro Mới
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Tiêu đề Rủi ro"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Mô tả Rủi ro"
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
              <InputLabel>Mức độ ảnh hưởng</InputLabel>
              <Select
                value={formData.impact}
                onChange={(e) => handleInputChange('impact', e.target.value)}
                label="Mức độ ảnh hưởng"
              >
                {impacts.map(impact => (
                  <MenuItem key={impact} value={impact}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={impact}
                        size="small"
                        sx={{
                          backgroundColor: getImpactColor(impact),
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
              <InputLabel>Khả năng xảy ra</InputLabel>
              <Select
                value={formData.likelihood}
                onChange={(e) => handleInputChange('likelihood', e.target.value)}
                label="Khả năng xảy ra"
              >
                {likelihoods.map(likelihood => (
                  <MenuItem key={likelihood} value={likelihood}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={likelihood}
                        size="small"
                        sx={{
                          backgroundColor: getLikelihoodColor(likelihood),
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Mức độ ưu tiên được tính toán:
              <Chip
                label={`Ưu tiên: ${priority}`}
                size="small"
                sx={{
                  ml: 1,
                  backgroundColor: getPriorityColor(priority),
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              />
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Kế hoạch giảm thiểu"
            value={formData.mitigationPlan}
            onChange={(e) => handleInputChange('mitigationPlan', e.target.value)}
            error={!!errors.mitigationPlan}
            helperText={errors.mitigationPlan}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Liên kết với Task (tùy chọn)
            </Typography>
            <Autocomplete
              options={availableTasks}
              value={availableTasks.find(task => task._id === formData.task) || null}
              onChange={(event, newValue) => {
                handleInputChange('task', newValue?._id || '');
              }}
              getOptionLabel={(option) => option.taskId ? `${option.taskId}: ${option.name}` : option.name || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Chọn task liên quan đến rủi ro"
                  size="small"
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography variant="body2">
                    {option.taskId}: {option.name}
                  </Typography>
                </Box>
              )}
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
          {loading ? 'Đang tạo...' : 'Tạo Rủi ro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewRiskPopup;
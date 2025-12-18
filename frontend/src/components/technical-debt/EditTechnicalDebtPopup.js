import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Autocomplete
} from '@mui/material';
import { technicalDebtService } from '../../api/services/technicalDebt.service';
import { sprintService } from '../../api/services/sprint.service';
import { moduleService } from '../../api/services/module.service';

const EditTechnicalDebtPopup = ({ open, debt, onClose, onDebtUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [availableSprints, setAvailableSprints] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Code Quality',
    severity: 'Medium',
    priority: 'Medium',
    status: 'Identified',
    estimatedEffort: '',
    assignedTo: '',
    sprint: '',
    module: ''
  });
  const [errors, setErrors] = useState({});

  const types = ['Code Quality', 'Performance', 'Security', 'Architecture', 'Documentation'];
  const severities = ['Low', 'Medium', 'High', 'Critical'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const statuses = ['Identified', 'Planned', 'In Progress', 'Resolved'];

  const fetchAvailableData = useCallback(async () => {
    if (!debt?.project) return;

    try {
      const [sprints, modules] = await Promise.all([
        sprintService.getAllSprints(),
        moduleService.getModulesByProject(debt.project)
      ]);

      // Filter sprints theo project
      const projectSprints = sprints.filter(sprint => sprint.project === debt.project);
      setAvailableSprints(projectSprints);
      setAvailableModules(modules);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, [debt?.project]);

  useEffect(() => {
    if (open && debt) {
      setFormData({
        title: debt.title || '',
        description: debt.description || '',
        type: debt.type || 'Code Quality',
        severity: debt.severity || 'Medium',
        priority: debt.priority || 'Medium',
        status: debt.status || 'Identified',
        estimatedEffort: debt.estimatedEffort?.toString() || '',
        assignedTo: debt.assignedTo?._id || '',
        sprint: debt.sprint?._id || '',
        module: debt.module?._id || ''
      });
      setErrors({});

      // Fetch available sprints và modules
      fetchAvailableData();
    }
  }, [open, debt, fetchAvailableData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề công nợ là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả công nợ là bắt buộc';
    }

    if (!formData.estimatedEffort || formData.estimatedEffort <= 0) {
      newErrors.estimatedEffort = 'Ước tính effort phải lớn hơn 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const debtData = {
        ...formData,
        estimatedEffort: parseInt(formData.estimatedEffort)
      };

      const updatedDebt = await technicalDebtService.updateTechnicalDebt(debt._id, debtData);
      onDebtUpdated(updatedDebt);
    } catch (error) {
      console.error('Failed to update technical debt:', error);
      setErrors({ submit: error.response?.data?.message || 'Không thể cập nhật công nợ kỹ thuật' });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved': return '#28a745';
      case 'In Progress': return '#007bff';
      case 'Planned': return '#ffc107';
      case 'Identified': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Code Quality': return '🧹';
      case 'Performance': return '⚡';
      case 'Security': return '🔒';
      case 'Architecture': return '🏗️';
      case 'Documentation': return '📚';
      default: return '🔧';
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Chỉnh sửa Công Nợ Kỹ Thuật: {debt.title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Tiêu đề Công Nợ"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Mô tả Công Nợ"
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
              <InputLabel>Loại công nợ</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                label="Loại công nợ"
              >
                {types.map(type => (
                  <MenuItem key={type} value={type}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{getTypeIcon(type)}</span>
                      <span>{type}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Mức độ nghiêm trọng</InputLabel>
              <Select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                label="Mức độ nghiêm trọng"
              >
                {severities.map(severity => (
                  <MenuItem key={severity} value={severity}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={severity}
                        size="small"
                        sx={{
                          backgroundColor: getSeverityColor(severity),
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
                          backgroundColor: getPriorityColor(priority),
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={status}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(status),
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

          <TextField
            fullWidth
            label="Ước tính Effort (giờ)"
            type="number"
            value={formData.estimatedEffort}
            onChange={(e) => handleInputChange('estimatedEffort', e.target.value)}
            error={!!errors.estimatedEffort}
            helperText={errors.estimatedEffort}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Autocomplete
              sx={{ flex: 1 }}
              options={availableSprints}
              value={availableSprints.find(sprint => sprint._id === formData.sprint) || null}
              onChange={(event, newValue) => {
                handleInputChange('sprint', newValue?._id || '');
              }}
              getOptionLabel={(option) => `Sprint ${option.name || option._id}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Liên kết với Sprint (tùy chọn)"
                  size="small"
                />
              )}
            />

            <Autocomplete
              sx={{ flex: 1 }}
              options={availableModules}
              value={availableModules.find(module => module._id === formData.module) || null}
              onChange={(event, newValue) => {
                handleInputChange('module', newValue?._id || '');
              }}
              getOptionLabel={(option) => option.name || option._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Liên kết với Module (tùy chọn)"
                  size="small"
                />
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
          {loading ? 'Đang cập nhật...' : 'Cập nhật Công Nợ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTechnicalDebtPopup;
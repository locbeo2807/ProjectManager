import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip
} from '@mui/material';
import { epicService } from '../../api/services/epic.service';
import { useAuth } from '../../contexts/AuthContext';

const NewEpicPopup = ({ open, onClose, projectId, onEpicCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Trung bình',
    assignee: '',
    acceptanceCriteria: ['']
  });
  const [errors, setErrors] = useState({});

  const priorities = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];

  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        priority: 'Trung bình',
        assignee: user._id,
        acceptanceCriteria: ['']
      });
      setErrors({});
    }
  }, [open, user._id]);

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
        project: projectId,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim())
      };

      const newEpic = await epicService.createEpic(epicData);
      onEpicCreated(newEpic);
    } catch (error) {
      console.error('Failed to create epic:', error);
      setErrors({ submit: error.response?.data?.message || 'Không thể tạo epic' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Tạo Epic Mới
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

          <FormControl fullWidth sx={{ mb: 2 }}>
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
          {loading ? 'Đang tạo...' : 'Tạo Epic'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewEpicPopup;
import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Menu, MenuItem, Grid, Avatar
} from '@mui/material';
import {
  Add, MoreVert, Code, Timeline, Person, Flag
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { technicalDebtService } from '../../api/services/technicalDebt.service';
import { ROLE_PERMISSIONS } from '../../constants/workflow';
import NewTechnicalDebtPopup from './NewTechnicalDebtPopup';
import EditTechnicalDebtPopup from './EditTechnicalDebtPopup';

const TechnicalDebtList = ({ projectId }) => {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const userPermissions = ROLE_PERMISSIONS[user.role] || {};
  const canCreateDebt = userPermissions.canCreateTechnicalDebts;
  const canUpdateDebt = userPermissions.canCreateTechnicalDebts; // Same permission for update

  useEffect(() => {
    fetchDebts();
  }, [projectId]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const data = await technicalDebtService.getTechnicalDebtsByProject(projectId);
      setDebts(data);
    } catch (error) {
      console.error('Failed to fetch technical debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, debt) => {
    setAnchorEl(event.currentTarget);
    setSelectedDebt(debt);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDebt(null);
  };

  const handleEditDebt = () => {
    setEditingDebt(selectedDebt);
    handleMenuClose();
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedDebt) return;

    try {
      const updatedDebt = await technicalDebtService.updateTechnicalDebtStatus(selectedDebt._id, { status });
      setDebts(debts.map(debt =>
        debt._id === updatedDebt._id ? updatedDebt : debt
      ));
    } catch (error) {
      console.error('Failed to update technical debt status:', error);
    }
    handleMenuClose();
  };

  const handleDeleteDebt = async () => {
    if (!selectedDebt) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa công nợ kỹ thuật này?')) {
      try {
        await technicalDebtService.deleteTechnicalDebt(selectedDebt._id);
        setDebts(debts.filter(debt => debt._id !== selectedDebt._id));
      } catch (error) {
        console.error('Failed to delete technical debt:', error);
      }
    }
    handleMenuClose();
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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Đang tải công nợ kỹ thuật...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Công Nợ Kỹ Thuật
        </Typography>
        {canCreateDebt && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowNewDebt(true)}
          >
            Thêm Công Nợ
          </Button>
        )}
      </Box>

      {debts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Code sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có công nợ kỹ thuật nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thêm công nợ kỹ thuật đầu tiên để theo dõi và cải thiện chất lượng code
          </Typography>
          {canCreateDebt && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowNewDebt(true)}
              sx={{ mt: 2 }}
            >
              Thêm Công Nợ Đầu Tiên
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {debts.map((debt) => (
            <Grid item xs={12} md={6} lg={4} key={debt._id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                        {debt.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${getTypeIcon(debt.type)} ${debt.type}`}
                          size="small"
                          sx={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            fontSize: '0.7rem'
                          }}
                        />
                        <Chip
                          label={`Mức độ: ${debt.severity}`}
                          size="small"
                          sx={{
                            backgroundColor: getSeverityColor(debt.severity),
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                        <Chip
                          label={`Ưu tiên: ${debt.priority}`}
                          size="small"
                          sx={{
                            backgroundColor: getPriorityColor(debt.priority),
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                        <Chip
                          label={debt.status}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(debt.status),
                            color: 'white',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                    </Box>

                    {canUpdateDebt && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, debt)}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {debt.description}
                  </Typography>

                  {debt.estimatedEffort && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Ước tính effort</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {debt.estimatedEffort} giờ
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        <Person sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        {debt.assignedTo?.name || 'Chưa giao'}
                      </Typography>
                    </Box>

                    {debt.sprint && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timeline sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Sprint {debt.sprint.name || debt.sprint}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditDebt}>Chỉnh sửa</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('Planned')}>Lên kế hoạch</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('In Progress')}>Đang thực hiện</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('Resolved')}>Đã giải quyết</MenuItem>
        <MenuItem onClick={handleDeleteDebt} sx={{ color: 'error.main' }}>
          Xóa
        </MenuItem>
      </Menu>

      {/* Popups */}
      {showNewDebt && (
        <NewTechnicalDebtPopup
          open={showNewDebt}
          onClose={() => setShowNewDebt(false)}
          projectId={projectId}
          onDebtCreated={(newDebt) => {
            setDebts([...debts, newDebt]);
            setShowNewDebt(false);
          }}
        />
      )}

      {editingDebt && (
        <EditTechnicalDebtPopup
          open={Boolean(editingDebt)}
          debt={editingDebt}
          onClose={() => setEditingDebt(null)}
          onDebtUpdated={(updatedDebt) => {
            setDebts(debts.map(debt =>
              debt._id === updatedDebt._id ? updatedDebt : debt
            ));
            setEditingDebt(null);
          }}
        />
      )}
    </Box>
  );
};

export default TechnicalDebtList;
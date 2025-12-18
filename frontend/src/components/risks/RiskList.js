import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  IconButton, Menu, MenuItem, Grid, Avatar
} from '@mui/material';
import {
  Add, MoreVert, Warning, TrendingUp, Person
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { riskService } from '../../api/services/risk.service';
import { ROLE_PERMISSIONS } from '../../constants/workflow';
import NewRiskPopup from './NewRiskPopup';
import EditRiskPopup from './EditRiskPopup';

const RiskList = ({ projectId }) => {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRisk, setShowNewRisk] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const userPermissions = ROLE_PERMISSIONS[user.role] || {};
  const canCreateRisk = userPermissions.canCreateRisks;
  const canUpdateRisk = userPermissions.canCreateRisks; // Cùng quyền cho update

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await riskService.getRisksByProject(projectId);
      setRisks(data);
    } catch (error) {
      console.error('Failed to fetch risks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const handleMenuOpen = (event, risk) => {
    setAnchorEl(event.currentTarget);
    setSelectedRisk(risk);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRisk(null);
  };

  const handleEditRisk = () => {
    setEditingRisk(selectedRisk);
    handleMenuClose();
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedRisk) return;

    try {
      const updatedRisk = await riskService.updateRiskStatus(selectedRisk._id, { status });
      setRisks(risks.map(risk =>
        risk._id === updatedRisk._id ? updatedRisk : risk
      ));
    } catch (error) {
      console.error('Failed to update risk status:', error);
    }
    handleMenuClose();
  };

  const handleDeleteRisk = async () => {
    if (!selectedRisk) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa rủi ro này?')) {
      try {
        await riskService.deleteRisk(selectedRisk._id);
        setRisks(risks.filter(risk => risk._id !== selectedRisk._id));
      } catch (error) {
        console.error('Failed to delete risk:', error);
      }
    }
    handleMenuClose();
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Closed': return '#28a745';
      case 'Mitigated': return '#007bff';
      case 'Assessed': return '#ffc107';
      case 'Identified': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const calculateRiskPriority = (impact, likelihood) => {
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Đang tải rủi ro...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Quản lý Rủi ro
        </Typography>
        {canCreateRisk && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowNewRisk(true)}
          >
            Thêm Rủi ro
          </Button>
        )}
      </Box>

      {risks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Warning sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có rủi ro nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thêm rủi ro đầu tiên để theo dõi và quản lý các rủi ro dự án
          </Typography>
          {canCreateRisk && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowNewRisk(true)}
              sx={{ mt: 2 }}
            >
              Thêm Rủi ro Đầu Tiên
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {risks.map((risk) => {
            const priority = calculateRiskPriority(risk.impact, risk.likelihood);

            return (
              <Grid item xs={12} md={6} lg={4} key={risk._id}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                          {risk.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={`Mức độ: ${risk.impact}`}
                            size="small"
                            sx={{
                              backgroundColor: getImpactColor(risk.impact),
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip
                            label={`Khả năng: ${risk.likelihood}`}
                            size="small"
                            sx={{
                              backgroundColor: getLikelihoodColor(risk.likelihood),
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip
                            label={`Ưu tiên: ${priority}`}
                            size="small"
                            sx={{
                              backgroundColor: getPriorityColor(priority),
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip
                            label={risk.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(risk.status),
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>
                      </Box>

                      {canUpdateRisk && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, risk)}
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {risk.description}
                    </Typography>

                    {risk.mitigationPlan && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Kế hoạch giảm thiểu:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {risk.mitigationPlan}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          <Person sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {risk.assignedTo?.name || 'Chưa giao'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {priority}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditRisk}>Chỉnh sửa</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('Assessed')}>Đánh giá</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('Mitigated')}>Giảm thiểu</MenuItem>
        <MenuItem onClick={() => handleUpdateStatus('Closed')}>Đóng</MenuItem>
        <MenuItem onClick={handleDeleteRisk} sx={{ color: 'error.main' }}>
          Xóa
        </MenuItem>
      </Menu>

      {/* Popups */}
      {showNewRisk && (
        <NewRiskPopup
          open={showNewRisk}
          onClose={() => setShowNewRisk(false)}
          projectId={projectId}
          onRiskCreated={(newRisk) => {
            setRisks([...risks, newRisk]);
            setShowNewRisk(false);
          }}
        />
      )}

      {editingRisk && (
        <EditRiskPopup
          open={Boolean(editingRisk)}
          risk={editingRisk}
          onClose={() => setEditingRisk(null)}
          onRiskUpdated={(updatedRisk) => {
            setRisks(risks.map(risk =>
              risk._id === updatedRisk._id ? updatedRisk : risk
            ));
            setEditingRisk(null);
          }}
        />
      )}
    </Box>
  );
};

export default RiskList;
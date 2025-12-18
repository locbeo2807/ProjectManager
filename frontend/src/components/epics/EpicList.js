import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, LinearProgress,
  Avatar, IconButton, Menu, MenuItem, Grid
} from '@mui/material';
import {
  Add, MoreVert, Timeline, Assignment, Person
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { epicService } from '../../api/services/epic.service';
import { ROLE_PERMISSIONS } from '../../constants/workflow';
import NewEpicPopup from './NewEpicPopup';
import EditEpicPopup from './EditEpicPopup';

const EpicList = ({ projectId }) => {
  const { user } = useAuth();
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewEpic, setShowNewEpic] = useState(false);
  const [editingEpic, setEditingEpic] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEpic, setSelectedEpic] = useState(null);

  const userPermissions = ROLE_PERMISSIONS[user.role] || {};
  const canCreateEpic = userPermissions.canCreateEpic;
  const canUpdateEpic = userPermissions.canCreateEpic; // Cùng quyền cho update

  const fetchEpics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await epicService.getEpicsByProject(projectId);
      setEpics(data);
    } catch (error) {
      console.error('Failed to fetch epics:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEpics();
  }, [fetchEpics]);

  const handleMenuOpen = (event, epic) => {
    setAnchorEl(event.currentTarget);
    setSelectedEpic(epic);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEpic(null);
  };

  const handleEditEpic = () => {
    setEditingEpic(selectedEpic);
    handleMenuClose();
  };

  const handleDeleteEpic = async () => {
    if (!selectedEpic) return;

    if (window.confirm('Bạn có chắc chắn muốn xóa epic này?')) {
      try {
        await epicService.deleteEpic(selectedEpic._id);
        setEpics(epics.filter(epic => epic._id !== selectedEpic._id));
      } catch (error) {
        console.error('Failed to delete epic:', error);
      }
    }
    handleMenuClose();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Khẩn cấp': return '#dc3545';
      case 'Cao': return '#fd7e14';
      case 'Trung bình': return '#ffc107';
      case 'Thấp': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hàng đợi': return '#6c757d';
      case 'Đang làm': return '#007bff';
      case 'Hoàn thành': return '#28a745';
      default: return '#6c757d';
    }
  };

  const calculateEpicProgress = (epic) => {
    if (!epic.userStories || epic.userStories.length === 0) return 0;

    const completedStories = epic.userStories.filter(story =>
      story.status === 'Hoàn thành' && story.reviewStatus === 'Đạt'
    ).length;

    return Math.round((completedStories / epic.userStories.length) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Đang tải epics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Quản lý Epic
        </Typography>
        {canCreateEpic && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowNewEpic(true)}
          >
            Tạo Epic
          </Button>
        )}
      </Box>

      {epics.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Chưa có epic nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo epic đầu tiên để bắt đầu quản lý các tính năng lớn của dự án
          </Typography>
          {canCreateEpic && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowNewEpic(true)}
              sx={{ mt: 2 }}
            >
              Tạo Epic Đầu Tiên
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {epics.map((epic) => {
            const progress = calculateEpicProgress(epic);

            return (
              <Grid item xs={12} md={6} lg={4} key={epic._id}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                          {epic.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <Chip
                            label={epic.priority}
                            size="small"
                            sx={{
                              backgroundColor: getPriorityColor(epic.priority),
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                          <Chip
                            label={epic.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(epic.status),
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                      </Box>

                      {canUpdateEpic && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, epic)}
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {epic.description}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Tiến độ</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: progress === 100 ? '#28a745' : '#007bff',
                            borderRadius: 3
                          }
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          <Person sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {epic.assignee?.name || 'Chưa giao'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timeline sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {epic.userStories?.length || 0} stories
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
        <MenuItem onClick={handleEditEpic}>Chỉnh sửa</MenuItem>
        <MenuItem onClick={handleDeleteEpic} sx={{ color: 'error.main' }}>
          Xóa
        </MenuItem>
      </Menu>

      {/* Popups */}
      {showNewEpic && (
        <NewEpicPopup
          open={showNewEpic}
          onClose={() => setShowNewEpic(false)}
          projectId={projectId}
          onEpicCreated={(newEpic) => {
            setEpics([...epics, newEpic]);
            setShowNewEpic(false);
          }}
        />
      )}

      {editingEpic && (
        <EditEpicPopup
          open={Boolean(editingEpic)}
          epic={editingEpic}
          onClose={() => setEditingEpic(null)}
          onEpicUpdated={(updatedEpic) => {
            setEpics(epics.map(epic =>
              epic._id === updatedEpic._id ? updatedEpic : epic
            ));
            setEditingEpic(null);
          }}
        />
      )}
    </Box>
  );
};

export default EpicList;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Typography, TextField, InputAdornment, Select, MenuItem,
  FormControl, Button, Card, CardContent, Chip, Grid, Skeleton,
  Paper, IconButton, Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import axiosInstance from '../api/axios';
import socketManager from '../utils/socket';
import LoadingOverlay from '../components/common/LoadingOverlay';

const statusColors = {
  'Khởi tạo': { background: '#fff3cd', color: '#b8860b' },
  'Đang triển khai': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          navigate('/login');
          return;
        }

        const response = await axiosInstance.get('/projects', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        setProjects(response.data);
        setFilteredProjects(response.data);
        setError(null);
      } catch (error) {
        if (error.response?.status === 401) {
          return;
        } else {
          setError('Có lỗi xảy ra khi tải danh sách dự án');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    // Lắng nghe sự kiện cập nhật dự án từ WebSocket
    const socket = socketManager.socket;
    const handleProjectListUpdate = (data) => {
      const updatedProject = data.project;
      if (updatedProject) {
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p._id === updatedProject._id ? updatedProject : p
          )
        );
      }
    };

    if (socket) {
      socket.on('project_list_updated', handleProjectListUpdate);
    }

    // Dọn dẹp listener khi component unmount
    return () => {
      if (socket) {
        socket.off('project_list_updated', handleProjectListUpdate);
      }
    };
  }, [navigate]);

  useEffect(() => {
    let result = [...projects];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(project => 
        project.projectId.toLowerCase().includes(searchLower) ||
        project.name.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(project => project.status === statusFilter);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case 'deadline-soonest':
        result.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        break;
      case 'deadline-latest':
        result.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        break;
      default:
        break;
    }

    setFilteredProjects(result);
  }, [projects, searchTerm, statusFilter, sortBy]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const handleViewDetails = (projectId) => {
    navigate(`/projects/${projectId}`);
  };



  // Hiển thị tất cả project mà backend đã cho phép user nhìn thấy,
  // chỉ áp dụng bộ lọc tìm kiếm / trạng thái / sắp xếp ở client.
  const visibleProjects = filteredProjects;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
        {loading && <LoadingOverlay text="Đang tải danh sách dự án..." style={{zIndex: 10}} />}

        {!loading && (
          <>
            {error && (
              <motion.div variants={itemVariants}>
                <Paper
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    borderRadius: 2
                  }}
                >
                  {error}
                </Paper>
              </motion.div>
            )}

            {/* Header Section */}
            <motion.div variants={itemVariants}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2.5,
                flexWrap: 'wrap',
                gap: 2
              }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                    Danh sách dự án
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quản lý và theo dõi tất cả các dự án của bạn
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/projects/new')}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}
                >
                  Tạo dự án mới
                </Button>
              </Box>
            </motion.div>

            {/* Filters Section */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Tìm kiếm theo ID hoặc tên dự án..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" sx={{ fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3.5}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        displayEmpty
                        sx={{
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <MenuItem value="all">Tất cả trạng thái</MenuItem>
                        <MenuItem value="Khởi tạo">Khởi tạo</MenuItem>
                        <MenuItem value="Đang triển khai">Đang triển khai</MenuItem>
                        <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3.5}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        displayEmpty
                        sx={{
                          borderRadius: 1.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <MenuItem value="newest">Mới nhất</MenuItem>
                        <MenuItem value="oldest">Cũ nhất</MenuItem>
                        <MenuItem value="deadline-soonest">Hạn chót gần nhất</MenuItem>
                        <MenuItem value="deadline-latest">Hạn chót muộn nhất</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
            </Paper>

            {/* Projects Grid */}
            {currentUser && visibleProjects.length > 0 ? (
              <motion.div variants={itemVariants}>
                <Grid container spacing={2}>
                  {visibleProjects.map((project, index) => (
                    <Grid item xs={12} sm={6} lg={4} xl={3} key={project._id}>
                      <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          sx={{
                            height: '100%',
                            cursor: 'pointer',
                            borderRadius: 2,
                            backgroundColor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                            }
                          }}
                          onClick={() => handleViewDetails(project._id)}
                        >
                          <CardContent sx={{ p: 2 }}>
                            {/* Header with icon and title */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: 'primary.light',
                                  mr: 1.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                <FolderIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={600}
                                  sx={{
                                    mb: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {project.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  {project.projectId}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Compact date info */}
                            <Box sx={{ mb: 1.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
                              </Typography>
                            </Box>

                            {/* Status and action in one line */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip
                                label={project.status}
                                size="small"
                                sx={{
                                  backgroundColor: statusColors[project.status]?.background || '#f1f5f9',
                                  color: statusColors[project.status]?.color || '#64748b',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 24,
                                  borderRadius: 1,
                                }}
                              />
                              <Tooltip title="Xem chi tiết">
                                <IconButton
                                  size="small"
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    width: 28,
                                    height: 28,
                                    '&:hover': {
                                      bgcolor: 'primary.dark',
                                    },
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <VisibilityIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants}>
                <Paper
                  sx={{
                    p: 8,
                    textAlign: 'center',
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
                  </Box>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
                    Không tìm thấy dự án
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc'
                      : 'Chưa có dự án nào được tạo hoặc bạn chưa là thành viên của dự án nào'}
                  </Typography>
                </Paper>
              </motion.div>
            )}
          </>
        )}
    </Box>
  );
};

export default Projects;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Grid, Card, CardContent, Typography, Avatar,
  LinearProgress, Chip, Alert, Skeleton
} from '@mui/material';
import {
  Assignment, Folder, Timeline, People, Business,
  Assessment
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/workflow';
import ProjectService from '../../api/services/project.service';
import TaskService from '../../api/services/task.service';
import MetricsService from '../../api/services/metrics.service';

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    projects: [],
    tasks: [],
    metrics: null,
    loading: true
  });

  const userPermissions = ROLE_PERMISSIONS[user.role] || {};
  // Simplified dashboard with fewer, more focused widgets
  const defaultWidgets = useMemo(() => ({
    'Developer': ['myTasks', 'teamPerformance'],
    'PM': ['projectOverview', 'myTasks', 'teamPerformance', 'keyMetrics'],
    'BA': ['requirements', 'myTasks', 'qualityMetrics'],
    'admin': ['projectOverview', 'teamPerformance', 'keyMetrics']
  }), []);

  const allowedWidgets = useMemo(() =>
    userPermissions.dashboardWidgets || defaultWidgets[user.role] || ['myTasks'],
    [userPermissions.dashboardWidgets, defaultWidgets, user.role]
  );

  const cardVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  }), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [pRes, tRes] = await Promise.allSettled([
        ProjectService.getAllProjects(),
        TaskService.getAllTasks()
      ]);

      const projects = pRes.status === 'fulfilled' ? (pRes.value || []) : [];
      const tasks = tRes.status === 'fulfilled' ? (tRes.value || []) : [];

      // Try to fetch metrics for the first active project
      let metrics = null;
      const firstProject = projects.find(p => p.status === 'Đang triển khai') || projects[0];
      if (firstProject) {
        try {
          const mRes = await MetricsService.getTeamPerformanceMetrics(firstProject._id);
          metrics = mRes || null;
        } catch (error) {
          // Silently fail if metrics not available
          metrics = null;
        }
      }

      setData({ projects, tasks, metrics, loading: false });
    };

    fetchDashboardData();
  }, [user]);

  // Calculate user-specific metrics
  const userMetrics = useMemo(() => {
    const myTasks = data.tasks.filter(task =>
      task.assignee?._id === user._id || task.reviewer?._id === user._id
    );

    const myProjects = (data.projects || []).filter(project => {
      const members = Array.isArray(project.members) ? project.members : [];
      const isMember = members.some(m => {
        if (!m) return false;
        const memberUser = typeof m.user === 'object' ? m.user : null;
        const memberId = memberUser?._id || (typeof m.user === 'string' ? m.user : null);
        return memberId && memberId === user?._id;
      });
      return isMember || ['BA', 'PM', 'admin'].includes(user?.role);
    });

    return {
      totalTasks: myTasks.length,
      completedTasks: myTasks.filter(t => t.status === 'Hoàn thành' && t.reviewStatus === 'Đạt').length,
      pendingReviews: myTasks.filter(t => t.reviewer?._id === user._id && t.reviewStatus === 'Chưa').length,
      overdueTasks: myTasks.filter(t => {
        if (!t.deadline) return false;
        return new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
      }).length,
      totalProjects: myProjects.length,
      activeProjects: myProjects.filter(p => p.status === 'Đang triển khai').length
    };
  }, [data.tasks, data.projects, user]);

  const renderWidget = useCallback((widgetType) => {
    switch (widgetType) {
      case 'projectOverview':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#007bff', mr: 2 }}>
                      <Folder />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Dự Án
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tổng quan dự án của bạn
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tổng số dự án</Typography>
                      <Typography variant="body2" fontWeight={600}>{userMetrics.totalProjects}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đang triển khai</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary">{userMetrics.activeProjects}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {data.projects.slice(0, 3).map(project => (
                      <Chip
                        key={project._id}
                        label={project.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'myTasks':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Assignment />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Công Việc
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Công việc của bạn
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tổng số công việc</Typography>
                      <Typography variant="body2" fontWeight={600}>{userMetrics.totalTasks}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đã hoàn thành</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {userMetrics.completedTasks}
                      </Typography>
                    </Box>
                    {userMetrics.pendingReviews > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Chờ review</Typography>
                        <Typography variant="body2" fontWeight={600} color="warning.main">
                          {userMetrics.pendingReviews}
                        </Typography>
                      </Box>
                    )}
                    {userMetrics.overdueTasks > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Quá hạn</Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main">
                          {userMetrics.overdueTasks}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={userMetrics.totalTasks > 0 ? (userMetrics.completedTasks / userMetrics.totalTasks) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#28a745',
                        borderRadius: 4
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'teamPerformance':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Hiệu Suất Nhóm
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tốc độ và năng suất nhóm
                      </Typography>
                    </Box>
                  </Box>

                  {data.metrics ? (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Công việc đang làm</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {data.metrics.activeTasks || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Thành viên</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {data.metrics.teamCapacity || 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2">Tốc độ sprint</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {data.metrics.sprintVelocity?.[0]?.velocity || 0} điểm
                        </Typography>
                      </Box>

                      <Alert severity="info" sx={{ fontSize: '0.75rem', p: 1 }}>
                        Tiến độ dự án: {Math.round(data.metrics.projectProgress || 0)}%
                      </Alert>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Đang tải dữ liệu...
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'keyMetrics':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <Timeline />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chỉ Số Chính
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Các chỉ số quan trọng
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tuân thủ SLA</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">91%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Chất lượng code</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {data.metrics?.codeCoverage || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Nợ kỹ thuật</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">
                        {data.metrics?.totalDebtItems || 0} mục
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="On Track" color="success" />
                      <Chip size="small" label="Good Quality" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'qualityMetrics':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#e83e8c', mr: 2 }}>
                      <Assessment />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chất Lượng
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Chỉ số chất lượng
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Phủ sóng code</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {data.metrics?.codeCoverage || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tự động hóa test</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {data.metrics?.automatedTestRate || 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Mật độ lỗi</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {(data.metrics?.defectDensity || 0).toFixed(2)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Lint: Pass" color="success" />
                      <Chip size="small" label="Tests: OK" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'requirements':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div
              variants={cardVariants}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#fd7e14', mr: 2 }}>
                      <Business />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Yêu Cầu
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quản lý yêu cầu
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Module đã tạo</Typography>
                      <Typography variant="body2" fontWeight={600}>12</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Release kế hoạch</Typography>
                      <Typography variant="body2" fontWeight={600}>8</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Chờ phê duyệt</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">3</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Đã phê duyệt" color="success" />
                      <Chip size="small" label="Pending" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      default:
        return null;
    }
  }, [data, userMetrics, cardVariants]);

  if (data.loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
          Dashboard {user.role}
        </Typography>

        <Grid container spacing={2}>
          {Array.from({ length: allowedWidgets.length || 4 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={`skeleton-${index}`}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" sx={{ fontSize: '1.25rem' }} />
                      <Skeleton variant="text" sx={{ fontSize: '0.875rem', width: '60%' }} />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Skeleton variant="text" sx={{ mb: 1 }} />
                    <Skeleton variant="text" sx={{ mb: 1 }} />
                    <Skeleton variant="text" sx={{ mb: 2, width: '80%' }} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      style={{ width: '100%' }}
    >
      <Box sx={{ p: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
            Dashboard {user.role}
          </Typography>
        </motion.div>

        <Grid container spacing={2}>
          {allowedWidgets.map(widgetType => renderWidget(widgetType))}
        </Grid>

        {allowedWidgets.length === 0 && (
          <Alert severity="info">
            Không có widget dashboard nào được cấu hình cho vai trò của bạn. Vui lòng liên hệ quản trị viên.
          </Alert>
        )}
      </Box>
    </motion.div>
  );
};

export default RoleBasedDashboard;

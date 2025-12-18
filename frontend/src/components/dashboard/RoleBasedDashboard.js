import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Grid, Card, CardContent, Typography, Avatar,
  LinearProgress, Chip, Alert, Skeleton
} from '@mui/material';
import {
  Assignment, Folder, Timeline, People, Business,
  Assessment, Code, Speed, Build, BugReport,
  Security, CheckCircle, TrendingUp, Cloud,
  Settings, ListAlt, Feedback,
  HealthAndSafety, Block, Psychology, TrackChanges,
  Rule, Gavel, AttachMoney
} from '@mui/icons-material';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/workflow';
import ProjectService from '../../api/services/project.service';
import TaskService from '../../api/services/task.service';
import MetricsService from '../../api/services/metrics.service';
import ModuleService from '../../api/services/module.service';
import SprintService from '../../api/services/sprint.service';
import { epicService } from '../../api/services/epic.service';

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    projects: [],
    tasks: [],
    modules: [],
    sprints: [],
    epics: [],
    metrics: null,
    qualityMetrics: null,
    dashboardMetrics: null,
    loading: true
  });

  const userPermissions = ROLE_PERMISSIONS[user.role] || {};

  const allowedWidgets = useMemo(() => {
    const widgets = userPermissions.dashboardWidgets;
    if (!widgets || widgets.length === 0) {
      // Fallback widgets dựa trên role - sử dụng ROLE_PERMISSIONS.dashboardWidgets làm fallback
      const roleWidgets = ROLE_PERMISSIONS[user.role]?.dashboardWidgets;
      if (roleWidgets && roleWidgets.length > 0) {
        return roleWidgets;
      }
      // Final fallback
      return ['myTasks'];
    }
    return widgets;
  }, [userPermissions.dashboardWidgets, user.role]);

  const cardVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    }
  }), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [pRes, tRes, mRes, sRes, eRes] = await Promise.allSettled([
        ProjectService.getAllProjects(),
        TaskService.getAllTasks(),
        ModuleService.getAllModules(),
        SprintService.getAllSprints(),
        epicService.getEpics()
      ]);

      const projects = pRes.status === 'fulfilled' ? (pRes.value || []) : [];
      const tasks = tRes.status === 'fulfilled' ? (tRes.value || []) : [];
      const modules = mRes.status === 'fulfilled' ? (mRes.value || []) : [];
      const sprints = sRes.status === 'fulfilled' ? (sRes.value || []) : [];
      const epics = eRes.status === 'fulfilled' ? (eRes.value || []) : [];

      // Thử lấy comprehensive metrics cho dự án active đầu tiên
      let metrics = null;
      let qualityMetrics = null;
      let dashboardMetrics = null;

      const firstProject = projects.find(p => p.status === 'Đang triển khai') || projects[0];
      if (firstProject) {
        try {
          const [teamRes, qualityRes, dashRes] = await Promise.allSettled([
            MetricsService.getTeamPerformanceMetrics(firstProject._id),
            MetricsService.getQualityMetrics(firstProject._id),
            MetricsService.getDashboardMetrics(firstProject._id)
          ]);

          metrics = teamRes.status === 'fulfilled' ? teamRes.value : null;
          qualityMetrics = qualityRes.status === 'fulfilled' ? qualityRes.value : null;
          dashboardMetrics = dashRes.status === 'fulfilled' ? dashRes.value : null;
        } catch (error) {
          // Silently fail nếu metrics không có sẵn
          console.warn('Failed to fetch metrics:', error);
        }
      }

      setData({
        projects,
        tasks,
        modules,
        sprints,
        epics,
        metrics,
        qualityMetrics,
        dashboardMetrics,
        loading: false
      });
    };

    fetchDashboardData();
  }, [user]);

  // Tính metrics riêng cho user
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
              whileHover="hover"
            >
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        mr: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Folder sx={{ color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Dự Án
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tổng quan dự án của bạn
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Tổng số dự án</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">{userMetrics.totalProjects}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Đang triển khai</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main">{userMetrics.activeProjects}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {data.projects.slice(0, 3).map((project, index) => (
                      <motion.div
                        key={project._id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * index, duration: 0.3 }}
                      >
                        <Chip
                          label={project.name}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.75rem',
                            borderRadius: 2,
                            background: 'rgba(37, 99, 235, 0.1)',
                            borderColor: 'primary.light',
                            color: 'primary.main',
                            fontWeight: 500
                          }}
                        />
                      </motion.div>
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
        const teamData = data.metrics?.map(member => ({
          name: member.userName?.substring(0, 12) || member.name?.substring(0, 12) || 'Unknown',
          completed: member.tasksCompleted || 0,
          assigned: member.tasksAssigned || 0
        })) || [];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <People />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Hiệu Suất Thành Viên
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Công việc hoàn thành theo thành viên
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completed" fill="#17a2b8" name="Hoàn thành" />
                        <Bar dataKey="assigned" fill="#90caf9" name="Được giao" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Active: ${teamData.length}`} color="primary" />
                    <Chip size="small" label={`Progress: ${data.dashboardMetrics?.projectProgress || 0}%`} color="success" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'keyMetrics':
        const keyMetricsData = [
          { name: 'Code Coverage', value: data.qualityMetrics?.codeCoverage || 0, color: '#4caf50' },
          { name: 'Test Automation', value: data.qualityMetrics?.automatedTestRate || 0, color: '#2196f3' },
          { name: 'Technical Debt', value: Math.max(0, 100 - (data.qualityMetrics?.totalDebtItems || 0) * 10), color: '#ff9800' },
          { name: 'Project Progress', value: data.dashboardMetrics?.projectProgress || 0, color: '#9c27b0' }
        ];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <Timeline />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chỉ Số Chính
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Các chỉ số quan trọng của dự án
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={keyMetricsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#6f42c1"
                          strokeWidth={3}
                          dot={{ fill: '#6f42c1', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Progress: ${data.dashboardMetrics?.projectProgress || 0}%`} color="primary" />
                    <Chip size="small" label={`Coverage: ${data.qualityMetrics?.codeCoverage || 0}%`} color="success" />
                    <Chip size="small" label={`Debt: ${data.qualityMetrics?.totalDebtItems || 0}`} color="warning" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'qualityMetrics':
        const qualityData = [
          { name: 'Code Coverage', value: data.qualityMetrics?.codeCoverage || 0, color: '#4caf50' },
          { name: 'Test Automation', value: data.qualityMetrics?.automatedTestRate || 0, color: '#2196f3' },
          { name: 'Defect Density', value: Math.min((data.qualityMetrics?.defectDensity || 0) * 20, 100), color: '#ff9800' },
          { name: 'Technical Debt', value: Math.max(0, 100 - (data.qualityMetrics?.totalDebtItems || 0)), color: '#f44336' }
        ];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#e83e8c', mr: 2 }}>
                      <Assessment />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chỉ Số Chất Lượng
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đánh giá chất lượng dự án
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qualityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#e83e8c" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Coverage: ${data.qualityMetrics?.codeCoverage || 0}%`} color="success" />
                    <Chip size="small" label={`Defects: ${(data.qualityMetrics?.defectDensity || 0).toFixed(2)}`} color="warning" />
                    <Chip size="small" label={`Debt: ${data.qualityMetrics?.totalDebtItems || 0}`} color="error" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'requirements':
        const totalModules = data.modules?.length || 0;
        const activeModules = data.modules?.filter(m => m.status === 'Đang triển khai').length || 0;
        const pendingModules = data.modules?.filter(m => m.status === 'Chờ phê duyệt').length || 0;

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
                      <Typography variant="body2" fontWeight={600}>{totalModules}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đang triển khai</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{activeModules}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Chờ phê duyệt</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">{pendingModules}</Typography>
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

      case 'epics':
        // Epic feature không được sử dụng trong dự án này
        return null;

      case 'acceptanceCriteria':
        const totalTasks = data.tasks?.length || 0;
        const completedTasks = data.tasks?.filter(task => task.status === 'Hoàn thành').length || 0;
        const pendingReviewTasks = data.tasks?.filter(task => task.reviewStatus === 'Chưa').length || 0;
        const approvedTasks = data.tasks?.filter(task => task.reviewStatus === 'Đạt').length || 0;
        const definedPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <CheckCircle />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Tiêu Chí Chấp Nhận
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Định nghĩa yêu cầu chi tiết
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đã định nghĩa</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">{definedPercentage}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Chờ review</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">{pendingReviewTasks}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Đã phê duyệt</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{approvedTasks}/{totalTasks}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Complete" color="success" />
                      <Chip size="small" label="Pending" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'businessValue':
        // Business value feature không được sử dụng trong dự án này
        return null;

      case 'codeQuality':
        const codeCoverage = data.qualityMetrics?.codeCoverage || 0;
        const technicalDebtItems = data.qualityMetrics?.totalDebtItems || 0;
        const codeSmells = data.qualityMetrics?.codeSmells || 0;

        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <Code />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chất Lượng Code
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đánh giá chất lượng mã nguồn
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Code coverage</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {codeCoverage}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Technical debt</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">
                        {technicalDebtItems}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Code smells</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">{codeSmells}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="A Grade" color="success" />
                      <Chip size="small" label="Clean" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'velocity':
        const velocityData = data.dashboardMetrics?.sprintVelocity?.map((item, index) => ({
          name: item.name || `Sprint ${index + 1}`,
          velocity: item.velocity || 0
        })) || [];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Speed />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Tốc Độ Sprint
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hiệu suất sprint theo thời gian
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={velocityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="velocity"
                          stroke="#28a745"
                          fill="#28a745"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip size="small" label="On Track" color="success" />
                    <Chip size="small" label="Improving" color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'technicalDebt':
        const debtData = [
          { name: 'Tổng nợ', value: data.qualityMetrics?.totalDebtItems || 0, fill: '#dc3545' },
          { name: 'Đã giải quyết', value: data.qualityMetrics?.resolvedDebtItems || 0, fill: '#28a745' },
          { name: 'Còn lại', value: Math.max(0, (data.qualityMetrics?.totalDebtItems || 0) - (data.qualityMetrics?.resolvedDebtItems || 0)), fill: '#ff9800' }
        ];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#dc3545', mr: 2 }}>
                      <Build />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Nợ Kỹ Thuật
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Theo dõi và quản lý nợ kỹ thuật
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={debtData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#dc3545" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Tổng: ${data.qualityMetrics?.totalDebtItems || 0}`} color="error" />
                    <Chip size="small" label={`Đã giải quyết: ${data.qualityMetrics?.resolvedDebtItems || 0}`} color="success" />
                    <Chip size="small" label={`Tỷ lệ: ${data.qualityMetrics?.debtResolutionRate || 0}%`} color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'testCases':
        const totalTestCases = data.tasks?.filter(task => task.taskType === 'Test Case').length || 0;
        const executedTestCases = data.tasks?.filter(task => 
          task.taskType === 'Test Case' && task.status === 'Hoàn thành'
        ).length || 0;
        const passRate = totalTestCases > 0 ? Math.round((executedTestCases / totalTestCases) * 100) : 0;

        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <BugReport />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Test Cases
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quản lý và thực thi test
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tổng test cases</Typography>
                      <Typography variant="body2" fontWeight={600}>{totalTestCases}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đã thực thi</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">{executedTestCases}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Tỷ lệ pass</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{passRate}%</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Automated" color="success" />
                      <Chip size="small" label="Manual" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'bugReports':
        const bugSeverityData = data.dashboardMetrics?.bugSeverity ? [
          { name: 'Low', value: data.dashboardMetrics.bugSeverity.Low || 0, fill: '#4caf50' },
          { name: 'Medium', value: data.dashboardMetrics.bugSeverity.Medium || 0, fill: '#ff9800' },
          { name: 'High', value: data.dashboardMetrics.bugSeverity.High || 0, fill: '#f44336' },
          { name: 'Critical', value: data.dashboardMetrics.bugSeverity.Critical || 0, fill: '#9c27b0' }
        ] : [];

        return (
          <Grid item xs={12} md={6} lg={6} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#dc3545', mr: 2 }}>
                      <BugReport />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Phân Bổ Lỗi Theo Mức Độ
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Thống kê lỗi theo mức độ nghiêm trọng
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bugSeverityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {bugSeverityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Tổng: ${data.dashboardMetrics?.totalBugs || 23}`} color="primary" />
                    <Chip size="small" label="Critical" color="error" />
                    <Chip size="small" label="Resolved" color="success" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'slaCompliance':
        const slaTasks = data.tasks?.filter(task => {
          const createdAt = new Date(task.createdAt);
          const now = new Date();
          const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
          
          if (task.taskType === 'Bug') {
            return hoursElapsed > 48; // SLA violation for bugs
          }
          return hoursElapsed > 24; // SLA violation for regular tasks
        }) || [];
        
        const pendingReviews = data.tasks?.filter(task => 
          task.reviewStatus === 'Chưa' && task.status !== 'Hoàn thành'
        ) || [];
        
        const slaComplianceRate = data.tasks?.length > 0 ? 
          Math.round(((data.tasks.length - slaTasks.length) / data.tasks.length) * 100) : 100;

        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Rule />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Tuân Thủ SLA
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Giám sát tuân thủ SLA
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tỷ lệ tuân thủ</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">{slaComplianceRate}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Vi phạm SLA</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">{slaTasks.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Chờ review</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">{pendingReviews.length}</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="On Target" color="success" />
                      <Chip size="small" label="Monitoring" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'budgetTracking':
        const totalBudget = data.projects?.reduce((sum, project) => sum + (project.budget || 0), 0) || 0;
        const usedBudget = data.projects?.reduce((sum, project) => sum + (project.usedBudget || 0), 0) || 0;
        const remainingBudget = totalBudget - usedBudget;
        const budgetUsageRate = totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0;

        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#ffc107', mr: 2 }}>
                      <AttachMoney />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Theo Dõi Ngân Sách
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quản lý chi phí dự án
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Ngân sách đã sử dụng</Typography>
                      <Typography variant="body2" fontWeight={600}>${usedBudget.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Ngân sách còn lại</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">${remainingBudget.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Tỷ lệ sử dụng</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">{budgetUsageRate}%</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="On Budget" color="success" />
                      <Chip size="small" label="Under Control" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'qualityAudit':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <Security />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Kiểm Tra Chất Lượng
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đánh giá và kiểm tra chất lượng
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Điểm chất lượng</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">8.5/10</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Vấn đề tìm thấy</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">12</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Đã khắc phục</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">10/12</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Passed" color="success" />
                      <Chip size="small" label="Minor Issues" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'riskAssessment':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#dc3545', mr: 2 }}>
                      <Gavel />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Đánh Giá Rủi Ro
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Xác định và quản lý rủi ro
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Rủi ro cao</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">3</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Rủi ro trung bình</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">7</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Đã giảm thiểu</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">5</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Mitigated" color="success" />
                      <Chip size="small" label="Monitoring" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'compliance':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Rule />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Tuân Thủ
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tuân thủ quy định và tiêu chuẩn
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tuân thủ quy trình</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">94%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Vi phạm phát hiện</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">1</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Đánh giá cuối tháng</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">Đạt</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Compliant" color="success" />
                      <Chip size="small" label="Audited" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'processMetrics':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <TrendingUp />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chỉ Số Quy Trình
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Hiệu quả quy trình làm việc
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Thời gian cycle</Typography>
                      <Typography variant="body2" fontWeight={600}>12.5 ngày</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Throughput</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">+8%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Waste reduction</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">15%</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Optimized" color="success" />
                      <Chip size="small" label="Efficient" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'teamHealth':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <HealthAndSafety />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Sức Khỏe Nhóm
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Đánh giá tinh thần và hiệu suất nhóm
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Điểm sức khỏe</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">8.2/10</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Mức độ hài lòng</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">85%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Vấn đề phát hiện</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">2</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Healthy" color="success" />
                      <Chip size="small" label="Engaged" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'sprintMetrics':
        const activeSprints = data.sprints?.filter(sprint => sprint.status === 'Đang triển khai') || [];
        const currentSprint = activeSprints[0];
        const sprintProgress = currentSprint ? 
          Math.round((currentSprint.tasks?.filter(task => task.status === 'Hoàn thành').length || 0) / 
          (currentSprint.tasks?.length || 1) * 100) : 0;
        
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <TrackChanges />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chỉ Số Sprint
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Theo dõi hiệu suất sprint
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Sprint hiện tại</Typography>
                      <Typography variant="body2" fontWeight={600}>{currentSprint?.name || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tiến độ</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{sprintProgress}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Task hoàn thành</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {currentSprint?.tasks?.filter(task => task.status === 'Hoàn thành').length || 0}/{currentSprint?.tasks?.length || 0}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="On Track" color="success" />
                      <Chip size="small" label="Good Pace" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'impediments':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#dc3545', mr: 2 }}>
                      <Block />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Chướng Ngại
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vấn đề và chướng ngại vật
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Chướng ngại mở</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">4</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đã giải quyết tuần này</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">6</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Thời gian giải quyết TB</Typography>
                      <Typography variant="body2" fontWeight={600}>2.3 ngày</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Resolved" color="success" />
                      <Chip size="small" label="Active" color="error" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'retrospectives':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#ffc107', mr: 2 }}>
                      <Psychology />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Retrospective
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Học hỏi và cải tiến liên tục
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Action items</Typography>
                      <Typography variant="body2" fontWeight={600}>8</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Đã hoàn thành</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">6/8</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Sprint tiếp theo</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">Sprint 13</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Improved" color="success" />
                      <Chip size="small" label="Learning" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'deployments':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Cloud />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Triển Khai
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quản lý release và deployment
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Triển khai tuần này</Typography>
                      <Typography variant="body2" fontWeight={600}>12</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tỷ lệ thành công</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">98%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Rollback</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">1</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Stable" color="success" />
                      <Chip size="small" label="Automated" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'infrastructure':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#17a2b8', mr: 2 }}>
                      <Settings />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Cơ Sở Hạ Tầng
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Giám sát hệ thống và hạ tầng
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Uptime hệ thống</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">99.9%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">CPU usage</Typography>
                      <Typography variant="body2" fontWeight={600}>65%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Memory usage</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">78%</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Healthy" color="success" />
                      <Chip size="small" label="Monitor" color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'monitoring':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <Timeline />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Giám Sát
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Theo dõi hiệu suất và logs
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Response time</Typography>
                      <Typography variant="body2" fontWeight={600}>245ms</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Error rate</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">0.1%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Active users</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">1,247</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Normal" color="success" />
                      <Chip size="small" label="Stable" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'ciCd':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#28a745', mr: 2 }}>
                      <Build />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        CI/CD Pipeline
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tự động hóa build và deploy
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Build success rate</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">96%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Average build time</Typography>
                      <Typography variant="body2" fontWeight={600}>8.5 min</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Deploy frequency</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">12/day</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Automated" color="success" />
                      <Chip size="small" label="Fast" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'backlog':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6f42c1', mr: 2 }}>
                      <ListAlt />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Product Backlog
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Quản lý backlog sản phẩm
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Items trong backlog</Typography>
                      <Typography variant="body2" fontWeight={600}>89</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Ưu tiên cao</Typography>
                      <Typography variant="body2" fontWeight={600} color="error.main">12</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">Story points ước tính</Typography>
                      <Typography variant="body2" fontWeight={600}>1,247</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label="Refined" color="success" />
                      <Chip size="small" label="Prioritized" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'stakeholderFeedback':
        return (
          <Grid item xs={12} md={6} lg={4} key={widgetType}>
            <motion.div variants={cardVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#ffc107', mr: 2 }}>
                      <Feedback />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Phản Hồi Stakeholder
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Thu thập và phân tích phản hồi
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Mức độ hài lòng</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">4.2/5</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Phản hồi chưa xử lý</Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">7</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2">NPS Score</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main">+45</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip size="small" label="Positive" color="success" />
                      <Chip size="small" label="Actionable" color="primary" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        );

      case 'roi':
        // ROI feature không được sử dụng trong dự án này
        return null;

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
      }}
    >
      <Box sx={{
        p: 3,
        maxWidth: 1400,
        mx: 'auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        minHeight: '100vh'
      }}>
        <motion.div variants={headerVariants}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2,
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            color: 'white'
          }}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1, color: 'white' }}>
                Dashboard {user.role}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Tổng quan công việc và dự án của bạn
              </Typography>
            </Box>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {allowedWidgets.map(widgetType => renderWidget(widgetType))}
        </Grid>

        {allowedWidgets.length === 0 && (
          <motion.div variants={cardVariants}>
            <Alert
              severity="info"
              sx={{
                borderRadius: 3,
                p: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              Không có widget dashboard nào được cấu hình cho vai trò của bạn. Vui lòng liên hệ quản trị viên.
            </Alert>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default RoleBasedDashboard;

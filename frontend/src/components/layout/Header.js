import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Box,
  Divider,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import DraftsIcon from '@mui/icons-material/Drafts';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import userAvatar from '../../asset/user.png';
import UserDetailDialog from '../popups/UserDetailDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axiosInstance from '../../api/axios';
import { motion } from 'framer-motion';
dayjs.extend(relativeTime);

const drawerWidth = 240;

const Header = ({ handleDrawerToggle, menuItems, mobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotification();
  const prevUnread = useRef(unreadCount || 0);
  const [bellPulse, setBellPulse] = useState(false);

  useEffect(() => {
    if (typeof unreadCount !== 'number') return;
    if (unreadCount > prevUnread.current) {
      setBellPulse(true);
      const t = setTimeout(() => setBellPulse(false), 900);
      prevUnread.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);

  // Đồng bộ notifications với context và đảm bảo mới nhất trước tiên
  useEffect(() => {
    // Giữ notifications đồng bộ với context và đảm bảo mới nhất trước tiên
    if (notifications && notifications.length > 0) {
      // Không cần đồng bộ vì chúng ta sử dụng notifications trực tiếp từ context
    }
  }, [notifications]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenu = (event) => {
    setNotificationAnchorEl(event.currentTarget);
    // Không tự động đánh dấu tất cả là đã đọc khi mở menu
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleProfile = () => {
    setIsUserDetailOpen(true);
    handleClose();
  };

  const handleUserDetailClose = () => {
    setIsUserDetailOpen(false);
  };
  
  const handleUserUpdate = async () => {
    await refreshUser();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    handleNotificationClose();

    try {
      // Xử lý navigation dựa trên type và refId
      if (
        (notification.type === 'project' || notification.type === 'project_confirmed' || notification.type === 'project_assigned')
        && notification.refId) {
        navigate(`/projects/${notification.refId}`);
      } else if (
        [
          'task_assigned',
          'task_review_assigned',
          'task_completed',
          'task_reviewed'
        ].includes(notification.type) && notification.refId
      ) {
        // Gọi API backend để lấy moduleId và sprintId cho task
        const accessToken = localStorage.getItem('accessToken');
        const response = await axiosInstance.get(`/tasks/navigation-info/${notification.refId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const { moduleId, sprintId } = response.data;

        // Ưu tiên điều hướng tới sprint detail nếu có
        if (sprintId) {
          navigate(`/sprints/${sprintId}`);
        } else if (moduleId) {
          navigate(`/modules/${moduleId}`);
        } else {
          navigate('/dashboard');
        }
      } else if (
        [
          'release_handover',
          'release_receive',
          'release_approve',
          'release_ready_for_approval',
          'release_accepted'
        ].includes(notification.type) && notification.refId
      ) {
        navigate(`/releases/${notification.refId}`);
      } else if (
        notification.type === 'module_assigned' && notification.refId
      ) {
        navigate(`/modules/${notification.refId}`);
      } else {
        // Fallback: về dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        return;
      }
      console.error('Error getting navigation info:', error);
      // Fallback: về dashboard nếu có lỗi
      navigate('/dashboard');
    }
  };

  const getPageTitle = () => {
    // Check for dynamic routes
    if (location.pathname.startsWith('/projects/')) {
      if (location.pathname === '/projects/new') {
        return 'Tạo dự án mới';
      }
      return 'Chi tiết dự án';
    }
    if (location.pathname.startsWith('/modules/')) {
      return 'Chi tiết module';
    }
    if (location.pathname.startsWith('/releases/')) {
      return 'Chi tiết release';
    }
    if (location.pathname.startsWith('/chats/')) {
      return 'Nhắn tin';
    }

    // Find in menuItems for static routes
    const menuItem = menuItems.find((item) => item.path === location.pathname);
    return menuItem?.text || 'Handover System';
  };

  return (
    <motion.div
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          background: '#ffffff',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          zIndex: mobileOpen ? 1100 : 1201,
        }}
      >
      <Toolbar sx={{ minHeight: 56, px: { xs: 2, sm: 3, md: 4 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { lg: 'none' }, borderRadius: 2, p: 1.2, '&:hover': { background: 'rgba(220,53,69,0.07)' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            color: 'text.primary',
            fontWeight: 700,
            letterSpacing: 0.5,
            fontSize: {
              xs: '0.9rem',
              sm: '1rem',
              md: '1.15rem',
              lg: '1.25rem'
            },
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            maxWidth: '100%',
            lineHeight: 1.2,
            py: 1
          }}
        >
          {getPageTitle()}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mr: 2,
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 0.2,
            display: { xs: 'none', sm: 'block' },
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user?.name}
        </Typography>
        <motion.div
          animate={bellPulse ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ display: 'inline-block' }}
        >
          <IconButton color="inherit" onClick={handleNotificationMenu} sx={{ mr: 1, borderRadius: 2, p: 1.2, '&:hover': { background: 'rgba(37, 99, 235, 0.07)' } }}>
            <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 12, minWidth: 18, height: 18, px: 0.5, boxShadow: '0 1px 4px rgba(239, 68, 68, 0.2)' } }}>
              <NotificationsIcon sx={{ color: 'primary.main' }} />
            </Badge>
          </IconButton>
        </motion.div>
        {/* Inline preview removed — notifications show only when bell (dropdown) is opened */}
        <IconButton
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
          sx={{ borderRadius: 2, p: 1.2, ml: 0.5, '&:hover': { background: 'rgba(220,53,69,0.07)' } }}
        >
          <Avatar sx={{ width: 34, height: 34, boxShadow: '0 2px 8px #6366f122' }} src={user?.avatarUrl || userAvatar} alt={user?.name} />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 24px rgba(31, 38, 135, 0.10)',
              minWidth: '220px',
              borderRadius: 2,
              p: 0.5,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
          <Divider key="divider-user-info" />
          <MenuItem key="profile" onClick={handleProfile} sx={{ borderRadius: 1, my: 0.5 }}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Trang cá nhân</ListItemText>
          </MenuItem>
          <Divider key="divider-profile-logout" />
          <MenuItem key="logout" onClick={handleLogout} sx={{ borderRadius: 1, my: 0.5 }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Đăng xuất</ListItemText>
          </MenuItem>
        </Menu>
        <Menu
          id="menu-notification"
          anchorEl={notificationAnchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 24px rgba(31, 38, 135, 0.10)',
              width: '350px',
              borderRadius: 2,
              p: 0.5,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Thanh tiêu đề cố định */}
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Thông báo</Typography>
          </Box>
          {/* Danh sách thông báo cuộn riêng biệt, không che tiêu đề */}
          <Box sx={{ flex: 1, maxHeight: 320, overflowY: 'auto', minHeight: 0 }}>
            {notifications.length > 0 ? (
              (() => {
                const previewCount = 5;
                const latest = [...notifications].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, previewCount);
                return (
                  <>
                    {latest.map((notification) => (
                      <MenuItem
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          py: 1.5,
                          px: 2,
                          whiteSpace: 'normal',
                          backgroundColor: notification.isRead ? 'inherit' : 'rgba(37, 99, 235, 0.08)',
                          borderLeft: notification.isRead ? 'none' : '3px solid',
                          borderLeftColor: notification.isRead ? 'transparent' : 'primary.main',
                          borderRadius: 1.2,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: notification.isRead ? 'rgba(0, 0, 0, 0.04)' : 'rgba(37, 99, 235, 0.12)',
                          },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box sx={{ width: '100%', pr: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 0.5,
                              fontWeight: notification.isRead ? 400 : 700,
                              color: notification.isRead ? 'text.primary' : 'primary.main',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={notification.message}
                          >
                            {notification.message}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              display: 'block',
                            }}
                          >
                            {dayjs(notification.createdAt).fromNow()}
                          </Typography>
                        </Box>
                        <Box>
                          {!notification.isRead && (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); markAsRead(notification._id); }} title="Đánh dấu đã đọc">
                              <DraftsIcon fontSize="small" sx={{ color: 'primary.main' }} />
                            </IconButton>
                          )}
                        </Box>
                      </MenuItem>
                    ))}

                    {notifications.length > previewCount && (
                      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{`Hiển thị ${previewCount} trong ${notifications.length} thông báo`}</Typography>
                      </Box>
                    )}
                  </>
                );
              })()
            ) : (
              <Box 
                sx={{ 
                  py: 6, 
                  px: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  color: 'text.secondary',
                }}
              >
                <NotificationsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">Không có thông báo nào</Typography>
              </Box>
            )}
          </Box>
          <Divider />
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
            <MenuItem onClick={() => { navigate('/notifications'); handleNotificationClose(); }} sx={{ width: '100%', justifyContent: 'center' }}>
              <ListItemText sx={{ textAlign: 'center' }}>Xem tất cả thông báo</ListItemText>
            </MenuItem>
          </Box>
        </Menu>
        {user && (
          <UserDetailDialog
            open={isUserDetailOpen}
            handleClose={handleUserDetailClose}
            user={user}
            onUserUpdate={handleUserUpdate}
          />
        )}
      </Toolbar>
    </AppBar>
    </motion.div>
  );
};

export default Header;

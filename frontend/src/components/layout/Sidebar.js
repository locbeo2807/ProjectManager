import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  useTheme,
  Badge,
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  Dashboard,
  Folder,
  People,
  Security,
  Build,
  Chat,
  Settings
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import logo from '../../asset/logo.png';
import { motion } from 'framer-motion';

const drawerWidth = 240;

// Cấu hình menu items dựa trên vai trò
const MENU_ITEMS_CONFIG = {
  dashboard: { icon: <Dashboard />, text: 'Dashboard', path: '/dashboard' },
  projects: { icon: <Folder />, text: 'Dự án', path: '/projects' },
  team: { icon: <People />, text: 'Đội ngũ', path: '/users' },
  security: { icon: <Security />, text: 'Bảo mật', path: '/security' },
  deployments: { icon: <Build />, text: 'Triển khai', path: '/deployments' },
  chats: { icon: <Chat />, text: 'Trò chuyện', path: '/chats' },
  admin: { icon: <Settings />, text: 'Quản trị', path: '/admin' }
};

// Tạo menu items dựa trên vai trò người dùng
const getMenuItemsForRole = (userRole, conversations) => {
  const baseItems = ['dashboard', 'projects', 'chats'];

  const roleSpecificItems = {
    'PM': ['team'],
    'BA': [],
    'Developer': [],
    'QA Tester': ['security'],
    'QC': ['security'],
    'Scrum Master': ['team'],
    'DevOps Engineer': ['deployments', 'security'],
    'Product Owner': ['team'],
    'admin': ['admin', 'team', 'security']
  };

  const allowedItems = [...baseItems, ...(roleSpecificItems[userRole] || [])];

  // Tính tổng số tin nhắn chưa đọc
  const totalUnreadCount = conversations.reduce((total, conv) => {
    return total + (conv.unreadCount || 0);
  }, 0);

  return allowedItems.map(itemKey => {
    const config = MENU_ITEMS_CONFIG[itemKey];
    if (!config) return null;

    let icon = config.icon;

    // Thêm badge cho chats
    if (itemKey === 'chats' && totalUnreadCount > 0) {
      const badgeContent = totalUnreadCount > 99 ? '+99' : totalUnreadCount;
      icon = (
        <Badge
          badgeContent={badgeContent}
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: 11,
              minWidth: 16,
              height: 16,
              px: 0.5,
              boxShadow: '0 1px 4px #dc354522',
              fontWeight: 600
            }
          }}
        >
          {config.icon}
        </Badge>
      );
    }

    return {
      ...config,
      icon
    };
  }).filter(Boolean);
};

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { conversations } = useChat();
  const theme = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = getMenuItemsForRole(user?.role, conversations);

const drawer = (
    <motion.div
      initial={{ x: -drawerWidth }}
      animate={{ x: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Toolbar sx={{ justifyContent: 'flex-start', py: 2, px: 2 }}>
        <Box
          component="img"
          src={logo}
          alt="Logo"
          sx={{
            height: 48,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
            mx: 'auto',
          }}
        />
      </Toolbar>
      <Divider sx={{ mx: 2, my: 1 }} />
      <List sx={{ px: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              padding: '10px 16px',
              borderRadius: '8px',
              margin: '2px 8px',
              width: `calc(100% - 16px)`,
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main,
                color: '#ffffff',
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                },
                '& .MuiListItemText-primary': {
                  color: '#ffffff',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '& .MuiListItemIcon-root': {
                marginRight: '12px',
                minWidth: '15px',
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: 500,
                  fontSize: '0.9rem',
                },
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mx: 2, my: 1 }} />
      <List sx={{ px: 1 }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            padding: '10px 16px',
            borderRadius: '8px',
            margin: '2px 8px',
            width: `calc(100% - 16px)`,
            boxSizing: 'border-box',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            '& .MuiListItemIcon-root': {
              marginRight: '12px',
              minWidth: '15px',
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Đăng xuất"
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: 500,
                fontSize: '0.9rem',
              },
            }}
          />
        </ListItem>
      </List>
    </motion.div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { lg: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;

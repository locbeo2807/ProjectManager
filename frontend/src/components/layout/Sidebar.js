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
  Assignment,
  People,
  Assessment,
  Security,
  Build,
  Business,
  Chat,
  Settings
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import logo from '../../asset/logo.png';
import { motion } from 'framer-motion';

const drawerWidth = 240;

// Role-based menu items configuration
const MENU_ITEMS_CONFIG = {
  dashboard: { icon: <Dashboard />, text: 'Dashboard', path: '/dashboard' },
  projects: { icon: <Folder />, text: 'Dự án', path: '/projects' },
  tasks: { icon: <Assignment />, text: 'Công việc', path: '/tasks' },
  team: { icon: <People />, text: 'Đội ngũ', path: '/users' },
  quality: { icon: <Assessment />, text: 'Chất lượng', path: '/quality' },
  security: { icon: <Security />, text: 'Bảo mật', path: '/security' },
  deployments: { icon: <Build />, text: 'Triển khai', path: '/deployments' },
  requirements: { icon: <Business />, text: 'Yêu cầu', path: '/requirements' },
  chats: { icon: <Chat />, text: 'Trò chuyện', path: '/chats' },
  admin: { icon: <Settings />, text: 'Quản trị', path: '/admin' }
};

// Generate menu items based on user role
const getMenuItemsForRole = (userRole, conversations) => {
  const baseItems = ['dashboard', 'projects', 'chats'];

  const roleSpecificItems = {
    'PM': ['tasks', 'team', 'quality'],
    'BA': ['requirements', 'tasks', 'quality'],
    'Developer': ['tasks', 'quality'],
    'QA Tester': ['tasks', 'quality', 'security'],
    'QC': ['quality', 'security'],
    'Scrum Master': ['tasks', 'team'],
    'DevOps Engineer': ['deployments', 'security'],
    'Product Owner': ['requirements', 'team'],
    'admin': ['admin', 'team', 'quality', 'security']
  };

  const allowedItems = [...baseItems, ...(roleSpecificItems[userRole] || [])];

  // Calculate total unread messages
  const totalUnreadCount = conversations.reduce((total, conv) => {
    return total + (conv.unreadCount || 0);
  }, 0);

  return allowedItems.map(itemKey => {
    const config = MENU_ITEMS_CONFIG[itemKey];
    if (!config) return null;

    let icon = config.icon;

    // Add badge for chats
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
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Toolbar sx={{ justifyContent: 'flex-start', py: 2, px: 3 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{
              height: 75,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
            }}
          />
        </motion.div>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.3 }}
          >
            <ListItem
              button
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                padding: '12px 16px',
                borderRadius: '8px',
                margin: '0 10px',
                width: `calc(100% - 20px)`,
                boxSizing: 'border-box',
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': {
                    color: '#ffffff',
                    minWidth: '15px',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#ffffff',
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  transform: 'translateX(4px)',
                },
                '& .MuiListItemIcon-root': {
                  marginRight: '8px',
                  minWidth: '15px',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </motion.div>
        ))}
      </List>
      <Divider />
      <List>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <ListItem
            button
            onClick={handleLogout}
            sx={{
              padding: '12px 16px',
              borderRadius: '8px',
              margin: '0 10px',
              width: `calc(100% - 20px)`,
              boxSizing: 'border-box',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                transform: 'translateX(4px)',
              },
              '& .MuiListItemIcon-root': {
                marginRight: '8px',
                minWidth: '15px',
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Đăng xuất" />
          </ListItem>
        </motion.div>
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
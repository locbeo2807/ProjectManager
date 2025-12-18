import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, List, ListItem, ListItemText, Divider, IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/Drafts';
import notificationService from '../services/notificationService';
import dayjs from 'dayjs';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationsHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { clearNotifications: clearGlobalNotifications, markAllAsRead: markAllGlobalAsRead, deleteNotification: deleteGlobalNotification, markAsRead: markGlobalAsRead } = useNotifications();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      // Sort by createdAt descending and take only the latest 5
      const sortedNotifications = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      setNotifications(sortedNotifications);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      // Đồng bộ với dropdown bell
      await markGlobalAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Đồng bộ với dropdown bell
      await deleteGlobalNotification(id);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Đồng bộ với dropdown bell
      await markAllGlobalAsRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
      // Đồng bộ với dropdown bell
      clearGlobalNotifications();
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      // If user is not authenticated, redirect to login instead of calling API
      navigate('/login');
      return;
    }

    loadNotifications();
  }, [navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Lịch sử thông báo</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleMarkAll}>Đánh dấu tất cả đã đọc</Button>
        <Button variant="outlined" color="error" onClick={handleClearAll}>Xóa tất cả</Button>
      </Stack>

      <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        {notifications.length > 0 ? (
          notifications.map(n => (
            <React.Fragment key={n._id}>
              <ListItem alignItems="flex-start" secondaryAction={
                <Stack direction="row" spacing={1}>
                  {!n.isRead && (
                    <IconButton edge="end" aria-label="mark-read" onClick={() => handleMarkAsRead(n._id)}>
                      <MarkAsReadIcon />
                    </IconButton>
                  )}
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(n._id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              }>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: n.isRead ? 400 : 700 }}>{n.message}</Typography>}
                  secondary={<Typography variant="caption">{dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}</Typography>}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))
        ) : (
          <Box sx={{ py: 6, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Không có thông báo nào</Typography>
          </Box>
        )}
      </List>
    </Box>
  );
};

export default NotificationsHistory;

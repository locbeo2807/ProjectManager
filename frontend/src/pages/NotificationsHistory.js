import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, List, ListItem, ListItemText, Divider, IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/Drafts';
import notificationService from '../services/notificationService';
import dayjs from 'dayjs';

const NotificationsHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadPage = async (p = 1) => {
    try {
      setLoading(true);
      const res = await notificationService.getNotificationsPaginated(p, limit);
      // res expected shape: { data, total, page, limit }
      const { data, total: t } = res;
      if (p === 1) setNotifications(data);
      else setNotifications(prev => [...prev, ...data]);
      setTotal(t);
      setPage(p);
    } catch (err) {
      console.error('Failed to load notifications page', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
      setTotal(0);
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

    loadPage(1);
  }, []);

  const handleLoadMore = () => {
    loadPage(page + 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Lịch sử thông báo</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleMarkAll}>Đánh dấu tất cả đã đọc</Button>
        <Button variant="outlined" color="error" onClick={handleClearAll}>Xóa tất cả</Button>
      </Stack>

      <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
        {notifications.map(n => (
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
        ))}
      </List>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        {notifications.length < total ? (
          <Button variant="outlined" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Đang tải...' : 'Xem thêm'}
          </Button>
        ) : (
          <Typography variant="body2" color="text.secondary">Không còn thông báo nào</Typography>
        )}
      </Box>
    </Box>
  );
};

export default NotificationsHistory;

/* eslint-disable no-restricted-globals */
let timers = new Map();

// Restore timers từ localStorage khi service worker khởi động
const restoreTimersFromStorage = () => {
  try {
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].postMessage({ type: 'GET_ALL_TIMERS' });
      }
    });
  } catch (error) {
    console.error('Error restoring timers:', error);
  }
};

self.addEventListener('message', (event) => {
  const { type, taskId, duration, endTime, timerData } = event.data;
  
  switch (type) {
    case 'START_TIMER':
      // Xóa timer hiện có nếu có
      if (timers.has(taskId)) {
        clearInterval(timers.get(taskId).interval);
      }
      
      const timerEndTime = endTime || (Date.now() + duration * 1000);
      timers.set(taskId, {
        endTime: timerEndTime,
        interval: setInterval(() => {
          const timeLeft = Math.max(0, Math.floor((timerEndTime - Date.now()) / 1000));
          
          // Thông báo tất cả clients
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'TIMER_UPDATE',
                taskId,
                timeLeft
              });
            });
          });
          
          if (timeLeft <= 0) {
            clearInterval(timers.get(taskId).interval);
            timers.delete(taskId);
            
            // Show notification
            self.registration.showNotification('Task Timeout', {
              body: `Time's up for task ${taskId}!`,
              icon: '/icon.png'
            });
          }
        }, 1000)
      });
      break;
      
    case 'STOP_TIMER':
      if (timers.has(taskId)) {
        clearInterval(timers.get(taskId).interval);
        timers.delete(taskId);
      }
      break;
      
    case 'GET_TIMER':
      if (timers.has(taskId)) {
        const timer = timers.get(taskId);
        const timeLeft = Math.max(0, Math.floor((timer.endTime - Date.now()) / 1000));
        event.ports[0].postMessage({ timeLeft });
      } else {
        event.ports[0].postMessage({ timeLeft: 0 });
      }
      break;
      
    case 'RESTORE_ALL_TIMERS':
      // Restore tất cả timers từ client
      if (timerData && Array.isArray(timerData)) {
        timerData.forEach(data => {
          const { taskId, endTime } = data;
          if (endTime > Date.now() && !timers.has(taskId)) {
            // Timer vẫn hợp lệ và chưa chạy, khởi động lại
            timers.set(taskId, {
              endTime: endTime,
              interval: setInterval(() => {
                const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
                
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => {
                    client.postMessage({
                      type: 'TIMER_UPDATE',
                      taskId,
                      timeLeft
                    });
                  });
                });
                
                if (timeLeft <= 0) {
                  clearInterval(timers.get(taskId).interval);
                  timers.delete(taskId);
                  
                  self.registration.showNotification('Task Timeout', {
                    body: `Time's up for task ${taskId}!`,
                    icon: '/icon.png'
                  });
                }
              }, 1000)
            });
          }
        });
      }
      break;
      
    default:
      // Xử lý các loại message không xác định
      break;
  }
});

// Restore timers khi service worker được kích hoạt
self.addEventListener('activate', (event) => {
  event.waitUntil(
    restoreTimersFromStorage()
  );
});

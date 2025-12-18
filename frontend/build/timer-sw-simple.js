/* eslint-disable no-restricted-globals */
let activeTimers = new Map();

// Single global timer update interval
let updateInterval = null;

const startGlobalTimer = () => {
  if (updateInterval) return; // Already running
  
  updateInterval = setInterval(() => {
    const now = Date.now();
    const timersToRemove = [];
    
    activeTimers.forEach((timerData, taskId) => {
      const timeLeft = Math.max(0, Math.floor((timerData.endTime - now) / 1000));
      
      // Notify all clients
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
        timersToRemove.push(taskId);
        
        // Show notification
        self.registration.showNotification('Task Timeout', {
          body: `Time's up for task ${taskId}!`,
          icon: '/icon.png'
        });
      }
    });
    
    // Remove expired timers
    timersToRemove.forEach(taskId => {
      activeTimers.delete(taskId);
    });
    
    // Stop global timer nếu không có active timers
    if (activeTimers.size === 0) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }, 1000);
};

self.addEventListener('message', (event) => {
  const { type, taskId, duration, endTime, timerData } = event.data;
  
  switch (type) {
    case 'START_TIMER':
      const timerEndTime = endTime || (Date.now() + duration * 1000);
      activeTimers.set(taskId, { endTime: timerEndTime });
      
      // Start global timer nếu chưa chạy
      startGlobalTimer();
      break;
      
    case 'STOP_TIMER':
      activeTimers.delete(taskId);
      
      // Stop global timer nếu không có active timers
      if (activeTimers.size === 0 && updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
      }
      break;
      
    case 'GET_TIMER':
      if (activeTimers.has(taskId)) {
        const timer = activeTimers.get(taskId);
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
          if (endTime > Date.now() && !activeTimers.has(taskId)) {
            activeTimers.set(taskId, { endTime });
          }
        });
        
        // Start global timer nếu có restored timers
        if (activeTimers.size > 0) {
          startGlobalTimer();
        }
      }
      break;
      
    default:
      break;
  }
});

// Restore timers on service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].postMessage({ type: 'GET_ALL_TIMERS' });
      }
    })
  );
});

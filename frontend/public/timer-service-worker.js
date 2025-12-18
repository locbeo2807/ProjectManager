// eslint-disable-next-line no-restricted-globals
let timerInterval;
let endTime;

// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', (event) => {
  if (event.data.type === 'START_TIMER') {
    const { duration, taskId } = event.data;
    endTime = Date.now() + duration * 1000;
    
    // Save to localStorage via message to main thread
    // eslint-disable-next-line no-restricted-globals
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SAVE_TO_LOCALSTORAGE',
          taskId,
          endTime
        });
      });
    });

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      
      // Notify all open tabs
      // eslint-disable-next-line no-restricted-globals
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'TIMER_UPDATE',
            timeLeft,
            taskId
          });
        });
      });

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        // Clear from localStorage
        // eslint-disable-next-line no-restricted-globals
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CLEAR_FROM_LOCALSTORAGE',
              taskId
            });
          });
        });
        
        // eslint-disable-next-line no-restricted-globals
        self.registration.showNotification('Task Timeout', {
          body: `Time's up for task ${taskId}!`,
          icon: '/icon.png'
        });
      }
    }, 1000);
  } else if (event.data.type === 'STOP_TIMER') {
    clearInterval(timerInterval);
    // Clear from localStorage
    // eslint-disable-next-line no-restricted-globals
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CLEAR_FROM_LOCALSTORAGE',
          taskId: event.data.taskId
        });
      });
    });
  } else if (event.data.type === 'GET_TIMER') {
    // Get from localStorage via message to main thread
    // eslint-disable-next-line no-restricted-globals
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].postMessage({
          type: 'GET_FROM_LOCALSTORAGE',
          taskId: event.data.taskId,
          port: event.ports[0]
        });
      }
    });
  }
});

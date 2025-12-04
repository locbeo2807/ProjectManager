// Test socket connection
const socket = require('socket.io-client');

// Connect to backend
const client = socket('http://localhost:5000', {
  auth: {
    token: 'test-token'
  }
});

client.on('connect', () => {
  console.log('✅ Socket connected from test client');
});

client.on('connect_error', (err) => {
  console.log('❌ Socket connection error:', err.message);
});

client.on('notification', (data) => {
  console.log('🔔 Received notification:', data);
});

// Test after 2 seconds
setTimeout(() => {
  console.log('Sending test notification...');
  // Gọi API test để trigger notification
  fetch('http://localhost:5000/api/test/test-notification', {
    method: 'POST'
  }).then(res => res.json()).then(data => {
    console.log('API Response:', data);
  }).catch(err => {
    console.error('API Error:', err);
  });
}, 2000);

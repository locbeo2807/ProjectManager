import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import NotificationSystem from './components/common/NotificationSystem';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <NotificationSystem>
    <App />
  </NotificationSystem>
  // </React.StrictMode>
);
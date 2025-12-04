import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NotificationProvider } from '../../contexts/NotificationContext';
import './NotificationSystem.module.css';

const NotificationSystem = ({ children }) => {
  return (
    <NotificationProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={5}
        className="notification-toast-container"
        toastClassName="notification-toast"
        bodyClassName="notification-toast-body"
        progressClassName="notification-toast-progress"
      />
      {/* NotificationContainer removed: use Header bell + Notifications page instead */}
    </NotificationProvider>
  );
};

export default NotificationSystem;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AnimatePresence, motion } from 'framer-motion';
import theme from './theme';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import NewProject from './pages/NewProject';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import SessionTimeoutProvider from './components/common/SessionTimeoutProvider';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Chats from './pages/Chats';
import ModuleDetail from './pages/ModuleDetail';
import SprintDetail from './pages/SprintDetail';
import Modules from './pages/Modules';
import NotificationsHistory from './pages/NotificationsHistory';

const PrivateRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Debug: Log user role và các roles được phép
  console.log('User role:', user.role);
  console.log('Allowed roles:', roles);
  console.log('Has access:', roles.length === 0 || roles.includes(user.role));

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
};

const pageVariants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -30,
    scale: 1.02,
  },
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smooth animation
  duration: 0.5
};

const AppRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Login />
            </motion.div>
          }
        />
        <Route
          path="/register"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Register />
            </motion.div>
          }
        />
        <Route
          path="/"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Navigate to="/dashboard" />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/dashboard"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/projects"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <ProjectDetail />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/users"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute roles={['admin']}>
                <Users />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/projects/new"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute roles={['PM', 'Product Owner','Project Manager']}>
                <NewProject />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/chats"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Chats />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/chats/:conversationId"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Chats />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/modules/:moduleId"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <ModuleDetail />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/sprints/:sprintId"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <SprintDetail />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/modules"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <Modules />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="/notifications"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <PrivateRoute>
                <NotificationsHistory />
              </PrivateRoute>
            </motion.div>
          }
        />
        <Route
          path="*"
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <NotFound />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 10000 }}
      />
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <ChatProvider>
            <SessionTimeoutProvider>
              <AppRoutes />
            </SessionTimeoutProvider>
          </ChatProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;

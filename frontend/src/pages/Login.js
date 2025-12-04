import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, resendOtp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const result = await login(formData.email, formData.password);
      if (result.mfa) {
        setStep('otp');
        setUserId(result.userId);
        setInfo('Vui lòng kiểm tra email để lấy mã OTP.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      await verifyOtp(userId, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực OTP thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfo('');
    setResendLoading(true);
    try {
      await resendOtp(formData.email);
      setInfo('Mã OTP đã được gửi lại. Vui lòng kiểm tra email.');
    } catch (err) {
      setError('Gửi lại OTP thất bại, vui lòng thử lại sau.');
    } finally {
      setResendLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `url(${require('../asset/nền.jpg')}) center/cover no-repeat fixed`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(37, 99, 235, 0.02) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Paper
          component={motion.div}
          variants={itemVariants}
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            width: '100%',
            maxWidth: 410,
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(37, 99, 235, 0.1)',
            position: 'relative',
            // '&::before': {
            //   content: '""',
            //   position: 'absolute',
            //   top: 0,
            //   left: 0,
            //   right: 0,
            //   height: '3px',
            //   background: 'linear-gradient(90deg, #dc3545 0%, #e74c3c 50%, #dc3545 100%)',
            //   borderRadius: '4px 4px 0 0',
            //   opacity: 0.8,
            // },
          }}
        >
        <motion.div variants={itemVariants}>
          <Box mb={3}>
            <img src={require('../asset/logo.png')} alt="Logo" style={{ height: 52, filter: 'drop-shadow(0 1px 3px rgba(37, 99, 235, 0.3))' }} />
          </Box>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Typography
            variant="h4"
            align="center"
            fontWeight={600}
            gutterBottom
            sx={{
              letterSpacing: 1.5,
              fontFamily: 'Inter, sans-serif',
              color: '#2563eb',
              mb: 1.5,
              textShadow: '0 2px 8px rgba(37, 99, 235, 0.10)',
            }}
          >
            Đăng nhập
          </Typography>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 3,
              fontWeight: 200,
              fontFamily: 'Montserrat, sans-serif',
              color: '#6c757d',
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            Chào mừng bạn quay lại!
          </Typography>
        </motion.div>
        <motion.div variants={itemVariants}>
          {error && (
            <Alert severity="error" sx={{
              mb: 3,
              width: '100%',
              bgcolor: 'rgba(239, 68, 68, 0.08)',
              color: '#7f1d1d',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: '#ef4444'
              }
            }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="info" sx={{
              mb: 3,
              width: '100%',
              bgcolor: 'rgba(37, 99, 235, 0.08)',
              color: '#1e3a8a',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 2,
              '& .MuiAlert-icon': {
                color: '#2563eb'
              }
            }}>
              {info}
            </Alert>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {step === 'login' ? (
          <motion.form
            key="login"
            onSubmit={handleSubmit}
            style={{ width: '100%' }}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <motion.div variants={itemVariants}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                margin="normal"
                required
                disabled={isLoading}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.95)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e9ecef',
                    borderWidth: 1.5,
                    borderRadius: 2,
                    transition: 'border-color 0.2s',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2563eb',
                    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.08)',
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(37, 99, 235, 0.5)',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6c757d',
                    '&.Mui-focused': {
                      color: '#2563eb',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#2c3e50',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'rgba(37, 99, 235, 0.7)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <TextField
                fullWidth
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                margin="normal"
                required
                disabled={isLoading}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.95)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e9ecef',
                    borderWidth: 1.5,
                    borderRadius: 2,
                    transition: 'border-color 0.2s',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2563eb',
                    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.08)',
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(37, 99, 235, 0.5)',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6c757d',
                    '&.Mui-focused': {
                      color: '#2563eb',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#2c3e50',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(37, 99, 235, 0.7)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((show) => !show)}
                        edge="end"
                        disabled={isLoading}
                        tabIndex={-1}
                        sx={{
                          color: 'rgba(37, 99, 235, 0.6)',
                          '&:hover': {
                            color: '#2563eb',
                            background: 'rgba(37, 99, 235, 0.08)',
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: 16,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                      boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    '&:disabled': {
                      background: '#6c757d',
                      color: '#ffffff',
                      boxShadow: 'none',
                      transform: 'none',
                    },
                  }}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : null}
                >
                  {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </Button>
              </motion.div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/register')}
                  disabled={isLoading}
                  sx={{
                    color: 'rgba(37, 99, 235, 0.8)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#2563eb',
                      textDecoration: 'underline',
                    },
                    '&:disabled': {
                      color: '#6c757d',
                    }
                  }}
                >
                  Chưa có tài khoản? Đăng ký
                </Link>
              </Box>
            </motion.div>
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            onSubmit={handleOtpSubmit}
            style={{ width: '100%' }}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <motion.div variants={itemVariants}>
              <TextField
                fullWidth
                label="Mã OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                required
                disabled={isLoading || resendLoading}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.95)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e9ecef',
                    borderWidth: 1.5,
                    borderRadius: 2,
                    transition: 'border-color 0.2s',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#dc3545',
                    boxShadow: '0 0 0 2px rgba(220,53,69,0.08)',
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(220,53,69,0.5)',
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6c757d',
                    '&.Mui-focused': {
                      color: '#dc3545',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#2c3e50',
                  },
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 2 }}>
              <Button 
                onClick={handleResendOtp}
                disabled={resendLoading || isLoading}
                variant="outlined"
                startIcon={resendLoading ? <CircularProgress size={18} sx={{ color: 'rgba(220, 53, 69, 0.8)' }} /> : null}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 500, 
                  textTransform: 'none', 
                  color: 'rgba(220, 53, 69, 0.8)', 
                  borderColor: 'rgba(220, 53, 69, 0.3)', 
                  transition: 'all 0.3s ease', 
                  '&:hover': { 
                    borderColor: '#dc3545', 
                    color: '#dc3545', 
                    background: 'rgba(220, 53, 69, 0.05)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    borderColor: '#6c757d',
                    color: '#6c757d',
                    transform: 'none',
                  },
                }}
              >
                {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
              </Button>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mb: 2, 
                  borderRadius: 2, 
                  fontWeight: 600, 
                  fontSize: 16, 
                  textTransform: 'none', 
                  background: 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)', 
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #c82333 0%, #dc3545 100%)', 
                    boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    background: '#6c757d',
                    color: '#ffffff',
                    boxShadow: 'none',
                    transform: 'none',
                  },
                }}
                disabled={isLoading || resendLoading}
                startIcon={isLoading ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : null}
              >
                {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
              </Button>
              <Button
                type="button"
                fullWidth
                variant="outlined"
                onClick={() => {
                  setStep('login');
                  setOtp('');
                  setError('');
                  setInfo('');
                  setUserId(null);
                  setFormData(f => ({ ...f, password: '' }));
                }}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 500, 
                  textTransform: 'none', 
                  color: 'rgba(220, 53, 69, 0.8)', 
                  borderColor: 'rgba(220, 53, 69, 0.3)', 
                  transition: 'all 0.3s ease', 
                  '&:hover': { 
                    borderColor: '#dc3545', 
                    color: '#dc3545', 
                    background: 'rgba(220, 53, 69, 0.05)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    borderColor: '#6c757d',
                    color: '#6c757d',
                    transform: 'none',
                  },
                }}
                disabled={isLoading || resendLoading}
              >
                Quay lại đăng nhập
              </Button>
              </Box>
            </motion.div>
          </motion.form>
          )}
        </AnimatePresence>
      </Paper>
      </motion.div>
    </Box>
  );
};

export default Login; 
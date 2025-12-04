import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormHelperText,
  Grid,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  Wc,
  Work,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Register = () => {
  const navigate = useNavigate();
  // Giả sử useAuth cung cấp các hàm cần thiết
  const { register, verifyOtp, resendOtp } = useAuth();

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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Developer",
    phoneNumber: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [step, setStep] = useState("register");
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);

  // Validation states - chỉ hiện lỗi khi field bị blur hoặc submit
  const [touched, setTouched] = useState({
    password: false,
  });
  const [showValidation, setShowValidation] = useState(false);

  // Validation functions
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("Mật khẩu phải có ít nhất 8 ký tự");
    if (!/[A-Z]/.test(password))
      errors.push("Mật khẩu phải có ít nhất 1 chữ hoa");
    if (!/[a-z]/.test(password))
      errors.push("Mật khẩu phải có ít nhất 1 chữ thường");
    if (!/\d/.test(password)) errors.push("Mật khẩu phải có ít nhất 1 số");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      errors.push("Mật khẩu phải có ít nhất 1 ký tự đặc biệt");
    return errors;
  };

  const getPasswordErrors = () => {
    if (!touched.password && !showValidation) return [];
    return validatePassword(formData.password);
  };

  const handleFieldBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Kiểm tra validation khi submit
    setShowValidation(true);

    const passwordErrors = validatePassword(formData.password);

    if (passwordErrors.length > 0) {
      setError("Vui lòng kiểm tra lại thông tin mật khẩu");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await register(formData);
      // Tất cả user đều có MFA enabled, nên luôn chuyển sang form OTP
      setUserId(res.userId);
      setInfo(res.message || "Vui lòng kiểm tra email để lấy mã OTP xác thực.");
      setStep("otp");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Đăng ký thất bại";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsOtpLoading(true);
    setError("");
    setInfo("");
    try {
      await verifyOtp(userId, otp);
      setInfo("Xác thực thành công! Đang chuyển đến Dashboard...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setError("OTP chưa đúng hoặc đã hết hạn. Vui lòng thử lại.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setResendLoading(true);
    try {
      await resendOtp(formData.email);
      setInfo("Mã OTP đã được gửi lại. Vui lòng kiểm tra email.");
    } catch (err) {
      setError("Gửi lại OTP thất bại, vui lòng thử lại sau.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `url(${require("../asset/nền.jpg")}) center/cover no-repeat fixed`,
        position: "relative",
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
          elevation={3}
          sx={{
            p: { xs: 2, sm: 4 },
            width: "100%",
            maxWidth: 700,
            borderRadius: 5,
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.10)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255,255,255,0.98)",
            border: "1.5px solid #ffeaea",
            position: "relative",
          }}
        >
        <motion.div variants={itemVariants}>
          <Box mb={2} mt={1}>
            {/* Thay thế require bằng import thích hợp nếu không dùng webpack */}
            <img
              src={require("../asset/logo.png")}
              alt="Logo"
              style={{
                height: 56,
                filter: "drop-shadow(0 2px 6px rgba(37, 99, 235, 0.18))",
              }}
            />
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
              fontFamily: "Inter, sans-serif",
              color: "#2563eb",
              mb: 1.5,
              textShadow: "0 2px 8px rgba(37, 99, 235, 0.10)",
            }}
          >
            Đăng ký
          </Typography>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 3,
              fontWeight: 400,
              fontFamily: "Montserrat, sans-serif",
              color: "#6c757d",
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            Tạo tài khoản mới để bắt đầu sử dụng.
          </Typography>
        </motion.div>
        <motion.div variants={itemVariants}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                width: "100%",
                bgcolor: "rgba(220, 53, 69, 0.08)",
                color: "#721c24",
                border: "1px solid rgba(220, 53, 69, 0.2)",
                borderRadius: 2,
                "& .MuiAlert-icon": { color: "#dc3545" },
              }}
            >
              {error}
            </Alert>
          )}
          {info && (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                width: "100%",
                bgcolor: "rgba(13, 110, 253, 0.08)",
                color: "#0c5460",
                border: "1px solid rgba(13, 110, 253, 0.2)",
                borderRadius: 2,
                "& .MuiAlert-icon": { color: "#0d6efd" },
              }}
            >
              {info}
            </Alert>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {step === "register" ? (
          <motion.form
            onSubmit={handleSubmit}
            style={{ width: "100%" }}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Họ và tên"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  // XÓA margin="normal"
                  required
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: "#dc3545", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc3545",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      "&.Mui-focused": {
                        color: "#dc3545",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  value={formData.phoneNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  // XÓA margin="normal"
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: "#dc3545", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc3545",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      "&.Mui-focused": {
                        color: "#dc3545",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  // XÓA margin="normal"
                  required
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: "#dc3545", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused fieldset": {
                        borderColor: "#dc3545",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      "&.Mui-focused": {
                        color: "#dc3545",
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  // XÓA margin="normal"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#dc3545",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      "&.Mui-focused": {
                        color: "#dc3545",
                      },
                    },
                  }}
                >
                  <InputLabel
                    sx={{
                      color: "#6c757d",
                      "&.Mui-focused": { color: "#dc3545" },
                    }}
                  >
                    Giới tính
                  </InputLabel>
                  <Select
                    value={formData.gender || ""}
                    label="Giới tính"
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    disabled={isLoading}
                    sx={{
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.95)",
                    }}
                    startAdornment={
                      <Wc sx={{ color: "#dc3545", mr: 1, fontSize: 20 }} />
                    }
                  >
                    <MenuItem value="male">Nam</MenuItem>
                    <MenuItem value="female">Nữ</MenuItem>
                    <MenuItem value="other">Khác</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  // XÓA margin="normal"
                  error={getPasswordErrors().length > 0}
                >
                  <TextField
                    label="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    onBlur={() => handleFieldBlur("password")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: "#dc3545", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={isLoading}
                            tabIndex={-1}
                            sx={{
                              color: "#dc3545",
                              "&:hover": {
                                color: "#fff",
                                background: "#dc3545",
                              },
                            }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: "#dc3545",
                        },
                      },
                      "& .MuiInputLabel-root": {
                        "&.Mui-focused": {
                          color: "#dc3545",
                        },
                      },
                    }}
                  />
                  {getPasswordErrors().length > 0 && (
                    <FormHelperText
                      sx={{ color: "#dc3545", fontSize: "0.8rem", mt: 0.5 }}
                    >
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {getPasswordErrors().map((error, index) => (
                          <li key={index} style={{ fontSize: "0.8rem" }}>
                            {error}
                          </li>
                        ))}
                      </Box>
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  // XÓA margin="normal"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#dc3545",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      "&.Mui-focused": {
                        color: "#dc3545",
                      },
                    },
                  }}
                >
                  <InputLabel
                    sx={{
                      color: "#6c757d",
                      "&.Mui-focused": { color: "#dc3545" },
                    }}
                  >
                    Vai trò
                  </InputLabel>
                  <Select
                    value={formData.role}
                    label="Vai trò"
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    disabled={isLoading}
                    sx={{
                      borderRadius: 2,
                      background: "rgba(255,255,255,0.95)",
                    }}
                    startAdornment={
                      <Work sx={{ color: "#dc3545", mr: 1, fontSize: 20 }} />
                    }
                  >
                    <MenuItem value="PM">PM</MenuItem>
                    <MenuItem value="BA">BA</MenuItem>
                    <MenuItem value="Developer">Developer</MenuItem>
                    <MenuItem value="QA Tester">QA Tester</MenuItem>
                    <MenuItem value="QC">QC</MenuItem>
                    <MenuItem value="Scrum Master">Scrum Master</MenuItem>
                    <MenuItem value="DevOps Engineer">DevOps Engineer</MenuItem>
                    <MenuItem value="Product Owner">Product Owner</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 4,
                mb: 2,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 17,
                textTransform: "none",
                background: "linear-gradient(90deg, #dc3545 0%, #e74c3c 100%)",
                boxShadow: "0 4px 16px rgba(220, 53, 69, 0.18)",
                transition: "all 0.3s",
                letterSpacing: 1,
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #c82333 0%, #dc3545 100%)",
                  boxShadow: "0 6px 24px rgba(220, 53, 69, 0.22)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0)",
                },
                "&:disabled": {
                  background: "#6c757d",
                  color: "#ffffff",
                  boxShadow: "none",
                  transform: "none",
                },
              }}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                ) : null
              }
            >
              {isLoading ? "Đang xử lý..." : "Đăng ký"}
            </Button>
            <Box sx={{ textAlign: "center" }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate("/login")}
                disabled={isLoading}
                sx={{
                  color: "#dc3545",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s",
                  "&:hover": {
                    color: "#e74c3c",
                    textDecoration: "underline",
                  },
                  "&:disabled": {
                    color: "#6c757d",
                  },
                }}
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </Box>
          </motion.form>
        ) : (
          <motion.form
            onSubmit={handleOtpSubmit}
            style={{ width: "100%" }}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <TextField
              fullWidth
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              margin="normal" // Giữ lại margin cho bước OTP nếu không dùng Grid
              required
              disabled={isOtpLoading || resendLoading}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.95)",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e9ecef",
                  borderWidth: 1.5,
                  borderRadius: 2,
                  transition: "border-color 0.2s",
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "#dc3545",
                    boxShadow: "0 0 0 2px rgba(220,53,69,0.08)",
                  },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "rgba(220,53,69,0.5)",
                  },
                "& .MuiInputLabel-root": {
                  color: "#6c757d",
                  "&.Mui-focused": {
                    color: "#dc3545",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#2c3e50",
                },
              }}
            />
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                mt: 2,
                mb: 2,
              }}
            >
              <Button
                onClick={handleResendOtp}
                disabled={resendLoading || isOtpLoading}
                variant="outlined"
                startIcon={
                  resendLoading ? (
                    <CircularProgress
                      size={18}
                      sx={{ color: "rgba(220, 53, 69, 0.8)" }}
                    />
                  ) : null
                }
                sx={{
                  borderRadius: 2,
                  fontWeight: 500,
                  textTransform: "none",
                  color: "rgba(220, 53, 69, 0.8)",
                  borderColor: "rgba(220, 53, 69, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: "#dc3545",
                    color: "#dc3545",
                    background: "rgba(220, 53, 69, 0.05)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&:disabled": {
                    borderColor: "#6c757d",
                    color: "#6c757d",
                    transform: "none",
                  },
                }}
              >
                {resendLoading ? "Đang gửi..." : "Gửi lại OTP"}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isOtpLoading || resendLoading}
                startIcon={
                  isOtpLoading ? (
                    <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                  ) : null
                }
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: 16,
                  textTransform: "none",
                  background:
                    "linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)",
                  boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #c82333 0%, #dc3545 100%)",
                    boxShadow: "0 6px 20px rgba(220, 53, 69, 0.4)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&:disabled": {
                    background: "#6c757d",
                    color: "#ffffff",
                    boxShadow: "none",
                    transform: "none",
                  },
                }}
              >
                {isOtpLoading ? "Đang xác nhận..." : "Xác nhận"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setStep("register");
                  setOtp("");
                  setError("");
                  setInfo("");
                }}
                disabled={isOtpLoading || resendLoading}
                sx={{
                  borderRadius: 2,
                  fontWeight: 500,
                  textTransform: "none",
                  color: "rgba(220, 53, 69, 0.8)",
                  borderColor: "rgba(220, 53, 69, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: "#dc3545",
                    color: "#dc3545",
                    background: "rgba(220, 53, 69, 0.05)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&:disabled": {
                    borderColor: "#6c757d",
                    color: "#6c757d",
                    transform: "none",
                  },
                }}
              >
                Quay lại đăng ký
              </Button>
            </Box>
          </motion.form>
          )}
        </AnimatePresence>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default Register;
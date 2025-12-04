import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e40af', // Professional dark blue
      light: '#3b82f6',
      dark: '#1e3a8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b', // Muted gray-blue
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#b91c1c',
    },
    warning: {
      main: '#d97706',
      light: '#f59e0b',
      dark: '#92400e',
    },
    success: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857',
    },
    background: {
      default: '#f1f5f9', // Slightly warmer gray
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 1px rgba(0, 0, 0, 0.14)',
    '0px 3px 6px rgba(0, 0, 0, 0.15), 0px 2px 4px rgba(0, 0, 0, 0.12)',
    '0px 6px 10px rgba(0, 0, 0, 0.15), 0px 1px 18px rgba(0, 0, 0, 0.12)',
    '0px 11px 15px rgba(0, 0, 0, 0.15), 0px 4px 20px rgba(0, 0, 0, 0.13)',
    '0px 15px 20px rgba(0, 0, 0, 0.15), 0px 5px 28px rgba(0, 0, 0, 0.12)',
    '0px 19px 25px rgba(0, 0, 0, 0.15), 0px 6px 36px rgba(0, 0, 0, 0.12)',
    '0px 23px 30px rgba(0, 0, 0, 0.15), 0px 7px 44px rgba(0, 0, 0, 0.12)',
    '0px 27px 35px rgba(0, 0, 0, 0.15), 0px 8px 52px rgba(0, 0, 0, 0.12)',
    '0px 31px 40px rgba(0, 0, 0, 0.15), 0px 9px 60px rgba(0, 0, 0, 0.12)',
    '0px 35px 45px rgba(0, 0, 0, 0.15), 0px 10px 68px rgba(0, 0, 0, 0.12)',
    '0px 39px 50px rgba(0, 0, 0, 0.15), 0px 11px 76px rgba(0, 0, 0, 0.12)',
    '0px 43px 55px rgba(0, 0, 0, 0.15), 0px 12px 84px rgba(0, 0, 0, 0.12)',
    '0px 47px 60px rgba(0, 0, 0, 0.15), 0px 13px 92px rgba(0, 0, 0, 0.12)',
    '0px 51px 65px rgba(0, 0, 0, 0.15), 0px 14px 100px rgba(0, 0, 0, 0.12)',
    '0px 55px 70px rgba(0, 0, 0, 0.15), 0px 15px 108px rgba(0, 0, 0, 0.12)',
    '0px 59px 75px rgba(0, 0, 0, 0.15), 0px 16px 116px rgba(0, 0, 0, 0.12)',
    '0px 63px 80px rgba(0, 0, 0, 0.15), 0px 17px 124px rgba(0, 0, 0, 0.12)',
    '0px 67px 85px rgba(0, 0, 0, 0.15), 0px 18px 132px rgba(0, 0, 0, 0.12)',
    '0px 71px 90px rgba(0, 0, 0, 0.15), 0px 19px 140px rgba(0, 0, 0, 0.12)',
    '0px 75px 95px rgba(0, 0, 0, 0.15), 0px 20px 148px rgba(0, 0, 0, 0.12)',
    '0px 79px 100px rgba(0, 0, 0, 0.15), 0px 21px 156px rgba(0, 0, 0, 0.12)',
    '0px 83px 105px rgba(0, 0, 0, 0.15), 0px 22px 164px rgba(0, 0, 0, 0.12)',
    '0px 87px 110px rgba(0, 0, 0, 0.15), 0px 23px 172px rgba(0, 0, 0, 0.12)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderRight: '1px solid #e2e8f0',
          '& .MuiListItemIcon-root': {
            color: '#64748b',
          },
          '& .MuiListItemText-root': {
            color: '#1e293b',
          },
          '& .MuiDivider-root': {
            backgroundColor: '#e2e8f0',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease-in-out',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2563eb',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default theme;

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Xanh dương hiện đại
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7c3aed', // Tím chuyên nghiệp
      light: '#a78bfa',
      dark: '#5b21b6',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    info: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#fafbfc', // Nền sáng sạch
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
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
    borderRadius: 6,
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
          borderRadius: 6,
          fontWeight: 500,
          padding: '6px 12px',
          fontSize: '0.875rem',
          transition: 'all 0.15s ease',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
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
            borderRadius: 6,
            transition: 'all 0.15s ease',
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
          borderRadius: 8,
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

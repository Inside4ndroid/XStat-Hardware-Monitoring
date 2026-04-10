import { createTheme, alpha } from '@mui/material'

// XStat Material Design 3 – dark theme
// M3 uses tonal surface layers instead of elevation-based shadows.

const seed = {
  primary:    '#7c6ef5',   // purple-indigo accent
  secondary:  '#03dac6',   // teal secondary
  error:      '#cf6679',
  warning:    '#ffb86c',
  success:    '#50fa7b',
  info:       '#8be9fd',
}

export const xstatTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main:  seed.primary,
      light: '#a99cf7',
      dark:  '#5b52c3',
    },
    secondary: {
      main: seed.secondary,
    },
    error:   { main: seed.error },
    warning: { main: seed.warning },
    success: { main: seed.success },
    info:    { main: seed.info },
    background: {
      default: '#0f0f11',   // Surface (darkest)
      paper:   '#1a1a1f',   // Surface container
    },
    text: {
      primary:   '#e6e1e5',
      secondary: '#cac4d0',
      disabled:  '#938f99',
    },
    divider: alpha('#cac4d0', 0.12),
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.375rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 },
    h5: { fontSize: '1rem',     fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', letterSpacing: '0.025em' },
    overline: { fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' },
  },

  shape: { borderRadius: 12 },   // M3 uses larger radii

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(202,196,208,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(202,196,208,0.4); }
      `,
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(0)',
        },
      },
      defaultProps: { elevation: 0 },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#1a1a1f',
          border: `1px solid ${alpha('#cac4d0', 0.08)}`,
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 24, textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2d2d35',
          border: `1px solid ${alpha('#cac4d0', 0.1)}`,
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
  },
})

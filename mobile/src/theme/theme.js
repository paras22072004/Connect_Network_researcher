// GeoConnect Mobile Design System & Theme Configuration
export const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  secondary: '#475569',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  
  bgMain: '#f8fafc',
  bgCard: '#ffffff',
  bgInput: '#f1f5f9',
  bgOverlay: 'rgba(15, 23, 42, 0.6)',

  textMain: '#0f172a',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  textWhite: '#ffffff',

  border: '#e2e8f0',
  borderDark: '#cbd5e1',

  shadowColor: '#000000'
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  medium: 'System'
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  }
};

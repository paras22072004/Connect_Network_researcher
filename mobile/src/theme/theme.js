// GeoConnect Mobile Design System & Theme Configuration
// Professional Forest-Green / Sage palette with warm off-white backgrounds
export const COLORS = {
  primary: '#24563B',       // Forest Green primary
  primaryDark: '#1A3F2B',   // Deep Forest Green
  primaryLight: '#EBF4EE',  // Light Sage / Forest tint
  forest: '#24563B',
  sage: '#5A7D69',          // Refined Sage accent
  sageLight: '#F0F5F1',
  sageMuted: '#849E8F',
  secondary: '#4A564F',     // Dark Charcoal/Slate secondary
  accent: '#3D7A58',
  warning: '#D97706',
  danger: '#DC2626',
  success: '#24563B',
  
  bgMain: '#F9F8F5',        // Warm off-white background
  bgCard: '#FFFFFF',        // Pure white card background
  bgInput: '#F2F1EC',       // Warm light neutral input background
  bgElevated: '#FFFFFF',
  bgOverlay: 'rgba(26, 36, 30, 0.65)',

  textMain: '#1A221E',       // Dark charcoal text
  textMuted: '#58655E',      // Refined charcoal/slate muted text
  textLight: '#8A9790',      // Light neutral text
  textWhite: '#FFFFFF',

  border: '#E3E7E2',        // Clean, subtle warm border
  borderLight: '#EDF0EB',
  borderDark: '#CBD2CA',

  shadowColor: '#1A221E'
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  medium: 'System'
};

import { Platform } from 'react-native';

export const SHADOWS = {
  sm: Platform.select({
    web: {
      boxShadow: '0 1px 3px rgba(26, 36, 30, 0.06)'
    },
    default: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    }
  }),
  md: Platform.select({
    web: {
      boxShadow: '0 2px 6px rgba(26, 36, 30, 0.08)'
    },
    default: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    }
  }),
  card: Platform.select({
    web: {
      boxShadow: '0 1px 4px rgba(26, 36, 30, 0.06)'
    },
    default: {
      shadowColor: COLORS.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    }
  })
};


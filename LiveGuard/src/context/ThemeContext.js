import React, { createContext, useContext, useState, useMemo } from 'react';

const LIGHT = {
  BACKGROUND_LIGHT:      '#F5F7FA',
  BACKGROUND_WHITE:      '#FFFFFF',
  BACKGROUND_CREAM:      '#FAFAF7',
  CARD_WHITE:            '#FFFFFF',
  TEXT_DARK:             '#1A1A2E',
  TEXT_MEDIUM:           '#6B7280',
  LABEL_DARK:            '#374151',
  PLACEHOLDER_GREY:      '#9CA3AF',
  BORDER_GREY:           '#E5E7EB',
  STATUS_GREY:           '#9CA3AF',
  TAB_ACTIVE:            '#DC2626',
  TAB_INACTIVE:          '#9CA3AF',
  PRIMARY_BLUE:          '#2563EB',
  PRIMARY_NAVY:          '#1E3A5F',
  LINK_BLUE:             '#2563EB',
  ACCENT_RED:            '#E85C2C',
  SOS_RED:               '#DC2626',
  ERROR_RED:             '#EF4444',
  ERROR_CARD_BG:         '#FEF2F2',
  ERROR_CARD_BORDER:     '#FECACA',
  SUCCESS_GREEN:         '#10B981',
  CHIP_ACTIVE_BG:        '#EFF6FF',
  CALL_BTN_BG:           '#DCFCE7',
  DECORATIVE_PINK:       '#FDE8E8',
  API_ERROR_BG:          '#FEF2F2',
  API_ERROR_BORDER:      '#FECACA',
  PENDING_BANNER_BG:     '#FFFBEB',
  PENDING_BANNER_BORDER: '#FDE68A',
  PENDING_TITLE_TEXT:    '#92400E',
  PENDING_SUB_TEXT:      '#B45309',
  WARNING_BG:            '#FFFBEB',
  WARNING_TEXT:          '#92400E',
};

const DARK = {
  BACKGROUND_LIGHT:      '#111113',
  BACKGROUND_WHITE:      '#1C1C1E',
  BACKGROUND_CREAM:      '#18181B',
  CARD_WHITE:            '#1C1C1E',
  TEXT_DARK:             '#F9FAFB',
  TEXT_MEDIUM:           '#9CA3AF',
  LABEL_DARK:            '#D1D5DB',
  PLACEHOLDER_GREY:      '#6B7280',
  BORDER_GREY:           '#2D2D2F',
  STATUS_GREY:           '#6B7280',
  TAB_ACTIVE:            '#F87171',
  TAB_INACTIVE:          '#6B7280',
  PRIMARY_BLUE:          '#3B82F6',
  PRIMARY_NAVY:          '#60A5FA',
  LINK_BLUE:             '#60A5FA',
  ACCENT_RED:            '#E85C2C',
  SOS_RED:               '#EF4444',
  ERROR_RED:             '#F87171',
  ERROR_CARD_BG:         '#2D1515',
  ERROR_CARD_BORDER:     '#7F1D1D',
  SUCCESS_GREEN:         '#34D399',
  CHIP_ACTIVE_BG:        '#1E3A5F',
  CALL_BTN_BG:           '#14532D',
  DECORATIVE_PINK:       '#3B1515',
  API_ERROR_BG:          '#2D1515',
  API_ERROR_BORDER:      '#7F1D1D',
  PENDING_BANNER_BG:     '#2D2000',
  PENDING_BANNER_BORDER: '#78350F',
  PENDING_TITLE_TEXT:    '#FCD34D',
  PENDING_SUB_TEXT:      '#FBBF24',
  WARNING_BG:            '#2D2000',
  WARNING_TEXT:          '#FCD34D',
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const colors = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};

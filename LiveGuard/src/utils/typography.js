// SINGLE SOURCE OF TRUTH for all typography
// Font family: system default — San Francisco (iOS) / Roboto (Android)
// Do NOT install custom fonts.
import colors from './colors';

export const fontWeight = {
  regular:   '400',
  medium:    '500',
  semiBold:  '600',
  bold:      '700',
  extraBold: '800',
};

export default {
  // Logo
  logoTitle: {
    fontWeight: fontWeight.bold,
    fontSize: 28,
    color: colors.PRIMARY_NAVY,
  },
  logoTagline: {
    fontWeight: fontWeight.medium,
    fontSize: 16,
    color: colors.PRIMARY_NAVY,
  },

  // Screen headings
  screenTitle: {
    fontWeight: fontWeight.bold,
    fontSize: 28,
    color: colors.TEXT_DARK,
  },
  screenTitleLarge: {
    fontWeight: fontWeight.bold,
    fontSize: 32,
    color: colors.TEXT_DARK,
  },
  screenSubtitle: {
    fontWeight: fontWeight.regular,
    fontSize: 16,
    color: colors.TEXT_MEDIUM,
  },

  // Forms
  fieldLabel: {
    fontWeight: fontWeight.semiBold,
    fontSize: 14,
    color: colors.LABEL_DARK,
  },
  inputText: {
    fontWeight: fontWeight.regular,
    fontSize: 16,
    color: colors.TEXT_DARK,
  },
  inputPlaceholder: {
    fontWeight: fontWeight.regular,
    fontSize: 16,
    color: colors.PLACEHOLDER_GREY,
  },
  errorText: {
    fontWeight: fontWeight.regular,
    fontSize: 13,
    color: colors.ERROR_RED,
  },

  // Buttons
  primaryButton: {
    fontWeight: fontWeight.semiBold,
    fontSize: 18,
    color: colors.BACKGROUND_WHITE,
  },
  outlinedButton: {
    fontWeight: fontWeight.semiBold,
    fontSize: 18,
    color: colors.TEXT_DARK,
  },

  // Links
  link: {
    fontWeight: fontWeight.semiBold,
    fontSize: 14,
    color: colors.LINK_BLUE,
  },

  // SOS
  sosText: {
    fontWeight: fontWeight.extraBold,
    fontSize: 56,
    color: colors.BACKGROUND_WHITE,
  },

  // Misc
  welcomeLabel: {
    fontWeight: fontWeight.regular,
    fontSize: 14,
    color: colors.ACCENT_RED,
  },
  headerUserName: {
    fontWeight: fontWeight.semiBold,
    fontSize: 16,
    color: colors.TEXT_DARK,
  },
  tabLabel: {
    fontWeight: fontWeight.regular,
    fontSize: 12,
    // color applied per tab (TAB_ACTIVE / TAB_INACTIVE)
  },
  chipText: {
    fontWeight: fontWeight.regular,
    fontSize: 14,
    color: colors.TEXT_DARK,
  },
};

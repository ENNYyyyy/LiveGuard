// SINGLE SOURCE OF TRUTH for component styles, spacing, and layout
import colors from './colors';

// ─── Spacing ────────────────────────────────────────────────────────────────
export const spacing = {
  screenPadding:  24,   // horizontal screen padding
  sectionSpacing: 24,   // vertical gap between sections
  inputGap:       16,   // vertical gap between form fields
  cardGap:        12,   // vertical gap between list cards
};

// ─── Layout ─────────────────────────────────────────────────────────────────
export const layout = {
  tabBarHeight: 60,
};

// ─── Component styles ────────────────────────────────────────────────────────
export const componentStyles = {
  inputField: {
    height:           52,
    borderWidth:      1.5,
    borderColor:      colors.BORDER_GREY,
    borderRadius:     12,
    paddingHorizontal: 16,
    backgroundColor:  colors.BACKGROUND_WHITE,
  },
  inputFieldError: {
    borderColor:      colors.ERROR_RED,
  },

  primaryButton: {
    height:           56,
    backgroundColor:  colors.PRIMARY_BLUE,
    borderRadius:     28,
    alignItems:       'center',
    justifyContent:   'center',
    marginHorizontal: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },

  outlinedButton: {
    height:           56,
    backgroundColor:  'transparent',
    borderWidth:      1.5,
    borderColor:      colors.BORDER_GREY,
    borderRadius:     28,
    alignItems:       'center',
    justifyContent:   'center',
  },

  chip: {
    height:           40,
    backgroundColor:  colors.BACKGROUND_WHITE,
    borderWidth:      1.5,
    borderColor:      colors.BORDER_GREY,
    borderRadius:     20,
    paddingHorizontal: 20,
    alignItems:       'center',
    justifyContent:   'center',
  },
  chipSelected: {
    borderColor:      colors.PRIMARY_BLUE,
    backgroundColor:  '#EFF6FF',   // light blue tint
  },

  card: {
    backgroundColor:  colors.BACKGROUND_WHITE,
    borderRadius:     16,
    padding:          16,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.08,
    shadowRadius:     8,
    elevation:        3,           // Android shadow
  },

  socialAuthButton: {
    width:            56,
    height:           56,
    borderWidth:      1.5,
    borderColor:      colors.BORDER_GREY,
    borderRadius:     12,
    alignItems:       'center',
    justifyContent:   'center',
  },

  statusBadge: {
    borderRadius:     8,
    paddingVertical:  6,
    paddingHorizontal: 16,
  },
  statusBadgeResolved: {
    backgroundColor:  colors.STATUS_GREY,
  },
  statusBadgeEnRoute: {
    backgroundColor:  colors.SUCCESS_GREEN,
  },
  statusBadgeText: {
    color:            colors.BACKGROUND_WHITE,
  },
};

/**
 * GymBuddy Design Tokens — Semantic Layer
 *
 * Rule: components import from here, never from colors.ts directly.
 * colors.ts  →  primitive palette  (all possible values)
 * tokens.ts  →  semantic layer     (named decisions about those values)
 *
 * Inspired by:
 *   Material Design 3  — color roles (primary, surface, on-surface…)
 *   GitHub Primer       — color.fg.default, color.bg.subtle…
 *   Radix UI            — scale + semantic split
 */

import { colors } from './colors'

// ─── Color tokens ─────────────────────────────────────────────────────────────
// NOTE: accent (primary interactive color) lives in AccentContext because it
// is user-selectable at runtime. Everything else is here.

export const colorTokens = {
  // ── Backgrounds
  bg: {
    screen:   colors.stone100,    // overall screen background
    surface:  colors.white,       // cards, panels, modals
    sunken:   colors.stone200,    // inset / recessed areas
    warm:     colors.cream,       // warm-tinted card interiors (exercise cards)
    warmDark: colors.creamDark,   // darker warm (set rows, highlights)
  },

  // ── Text
  text: {
    primary:   colors.stone900,   // headings, main content
    secondary: colors.stone700,   // supporting text
    muted:     colors.stone500,   // placeholders, hints, labels
    faint:     colors.stone400,   // disabled, de-emphasised
    onDark:    colors.creamLight, // text on dark/brown surfaces
    onAccent:  colors.white,      // text on the amber action color
  },

  // ── Borders & dividers
  border: {
    default: colors.stone300,     // card borders, input borders
    light:   colors.stone200,     // subtle dividers
    strong:  colors.stone400,     // visible separators
  },

  // ── Interactive / state
  state: {
    error: colors.error,
  },

  // ── Brand surfaces (the warm brown palette used in headers/exercise cards)
  brand: {
    header:  colors.brown900,     // exercise card header bar, modal header
    tan:     colors.tan,          // content background behind exercise cards
    tanDark: colors.tanDark,      // zone below exercise cards
  },
} as const

// ─── Spacing tokens ────────────────────────────────────────────────────────────
// Based on an 8-point grid. All spacing in the app should come from here.
// xs=4  sm=8  md=16  lg=24  xl=40
//
// Names describe *intent*, not just the size:
//   space.componentGap  = gap between items in a list row
//   space.cardPadding   = padding inside a card
//   space.screenPadding = horizontal margin on full-width screens

export const space = {
  none:   0,
  xxs:    2,
  xs:     4,   // icon hitslop padding, tiny nudges
  sm:     8,   // gap between related elements, icon margins
  md:    16,   // card padding, list item padding
  lg:    24,   // screen horizontal padding, section gaps
  xl:    40,   // large section spacing, modal padding

  // Semantic aliases — use these in components, not the raw sizes above
  cardPadding:    16,   // padding inside exercise cards, panels
  screenPadding:  24,   // horizontal padding on full-width screens
  componentGap:    8,   // gap between items in a row (buttons, chips)
  sectionGap:     24,   // vertical gap between distinct sections
  inputPaddingH:  14,   // horizontal padding inside text inputs
  inputPaddingV:  10,   // vertical padding inside text inputs
} as const

// ─── Shape tokens ──────────────────────────────────────────────────────────────
export const radius = {
  xs:     6,   // small buttons, tags
  sm:     8,   // inputs, small cards
  md:    12,   // cards, modals, most buttons
  lg:    16,   // larger modals
  xl:    28,   // bottom sheets, overlays
  full: 999,   // pills, circular elements
} as const

// ─── Typography tokens ─────────────────────────────────────────────────────────
export const typography = {
  size: {
    xs:   11,  // uppercase labels, captions
    sm:   13,  // secondary labels, hints
    md:   14,  // body text, form labels
    lg:   16,  // primary body, inputs
    xl:   18,  // set values, prominent numbers
    xxl:  20,  // screen titles
    hero: 26,  // wordmark, hero numbers
  },
  weight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semiBold:  '600' as const,
    bold:      '700' as const,
    heavy:     '800' as const,
  },
  lineHeight: {
    tight:  18,
    normal: 22,
    loose:  28,
  },
} as const

// ─── Shadow tokens ─────────────────────────────────────────────────────────────
export const shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
} as const

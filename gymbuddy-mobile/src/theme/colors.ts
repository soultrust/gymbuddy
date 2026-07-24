export const colors = {
  // Amber palette
  amber600: '#d97706',
  amber500: '#f59e0b',
  amber400: '#fbbf24',
  amber300: '#fdba74',
  amber200: '#ffedd2',
  amber100: '#ffdfb8',

  // Cream / warm whites
  cream: '#fff4e6',
  creamLight: '#fff7ed',
  creamDark: '#ffe5d0',

  // Set row — darker warm gray (not orange) to contrast cream cards
  setRowBg: '#ddd9d5',
  setRowBgTint: '#9aefe4', // light but more saturated turquoise for reps chips

  // Brown palette
  brown900: '#5A4A2F',
  tan: '#c9a882',
  tanDark: '#9e6e38',

  // Shared app background zones
  detailBg: '#b8a898',       // main bg — warm gray
  detailBgLight: '#d4ccc5',  // subheader / lighter surface on detail page
  detailZoneDark: '#7a6a5a', // add-exercise zone — muted warm gray-brown
  tableHeader: 'transparent', // table / card header bars (list + detail)

  // Stone palette (warm grays)
  stone900: '#1c1917',
  stone800: '#292524',
  stone700: '#44403c',
  stone600: '#57534e',
  stone500: '#78716c',
  stone400: '#a8a29e',
  stone300: '#d6d3d1',
  stone200: '#e7e5e4',
  stone100: '#f5f5f4',

  // Semantic surface tokens
  // Change these to retheme the whole app's panel backgrounds
  surface: '#f0efee',        // main panel / card background
  surfaceInput: '#e8e6e3',   // input fields, rows within panels

  // Functional
  white: '#fff',
  black: '#000',
  error: '#dc2626',
} as const

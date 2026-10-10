// Design tokens for the whole app. This file is the single source of
// truth for color, type, spacing, and radius — new styles should read
// from here rather than writing raw hex/px values inline, so the system
// stays easy to retune in one place as the app grows.
//
// Palette ported from the original web prototype (built under the name
// "ClimbLog," before the app was renamed to Sent); the secondary/tertiary
// grays below were consolidated and re-checked against WCAG AA (4.5:1
// for text, 3:1 for icons/UI components) — see the comment on each.

export const COLORS = {
  // Brand
  accent: '#CC4A08', // white text on this: 4.62:1 — passes AA, but tightly. Don't lighten without re-checking.
  accentDark: '#9A3412', // 7.31:1 on white — the safe default for orange text/links (prefer this over `accent` for text)
  accentTint: '#FFF3E9',

  // Text hierarchy (iOS-HIG-style: primary / secondary / tertiary)
  ink: '#222222', // primary text — 14.9:1 on white
  sub: '#717171', // secondary text, section labels, captions, muted icons — 4.88:1 on white / ~4.55:1 on `bg` (still passes, but has little margin — don't darken `bg` further without rechecking this)
  placeholder: '#B0B0B0', // form-field placeholder text only — intentionally lighter than `sub` (standard placeholder convention); never use for real content text or icons that must stay readable

  border: '#E6E2DC', // neutral hairline for dividers and input borders
  inputBorder: '#B5B5B5', // text-field outline — 3:1+ on white, unlike the decorative `border` hairline
  bg: '#FFFFFF', // fill for every "box" (cards, rows, stat tiles) — white on the neutral page
  cream: '#F0EDE8', // inset controls (pills, segmented tracks) that sit on the page or inside white surfaces
  pageFlat: '#F7F6F4', // page background for every screen — neutral, so the orange accent stays the only strong color
  white: '#FFFFFF',
  shadow: '#000000', // neutral — shadows only signal elevation, never decorate

  danger: '#A32D2D', // danger text/links — 7.06:1 on white
  dangerTint: '#FCEBEB',
  dangerStrong: '#E8544A', // higher-saturation red for momentary UI (the swipe-to-delete button fill) — white icon on this is 3.6:1, fine for icons (non-text) but don't use for text

  success: '#00A699',

  // Identity accent — the "other person" avatar placeholder background,
  // deliberately distinct from the brand orange (used for the signed-in
  // user's own avatar) so the two read as different roles at a glance.
  friendAvatar: '#2B6CA3', // darkened from the original #3396D3 — white initials on that were only 3.26:1 (failed AA); this is 5.56:1

  // Calendar / inert states — exempt from text contrast requirements
  // since these represent genuinely disabled, non-interactive UI (future
  // dates you can't select).
  calendarInactive: '#D8D2C4',
};

export const RADIUS = {
  card: 20,
  control: 14,
  pill: 999,
};

// 8pt-based spacing scale (iOS HIG convention). Not yet applied
// everywhere — most existing screens already land on these values
// inline; use these tokens for anything new instead of another literal.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Semantic type scale, modeled on iOS's Large Title / Title / Headline /
// Body hierarchy rather than copying its exact point sizes (this app's
// scale was already established and is a bit larger throughout — see
// CLAUDE.md's note on the deliberate type-scale bump). Spread these into
// a component's style rather than restating fontSize/fontWeight inline,
// e.g. `title: { ...TYPE.pageTitle, color: COLORS.ink }`.
export const TYPE = {
  pageTitle: { fontSize: 21, fontWeight: '600' as const }, // top-level screen headers: "Friends", "Sessions", "Account"
  sheetTitle: { fontSize: 17, fontWeight: '700' as const }, // modal/sheet headers: AddClimbSheet, ConfirmSheet, InfoSheet, EditProfileModal...
  sectionLabel: { fontSize: 17, fontWeight: '700' as const }, // in-page section headers: "Project climbs", "Your gyms" — same size as sheetTitle by design, different role
  body: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 14, fontWeight: '500' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

// Soft neutral drop shadow shared by every white card/row on the gradient page.
export const CARD_SHADOW = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

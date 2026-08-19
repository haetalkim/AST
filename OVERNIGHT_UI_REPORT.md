# Overnight UI Redesign Report

Scope: UI-only presentation migration of the 6 remaining real app screens to the new design system (`REFERENCE_REDESIGN.html` + `DESIGN.md` + Tailwind tokens), continuing from the prior session's landing page / sensor explorer migration.

## Screens fully migrated

All 6 screens were migrated, tested, linted, and committed independently:

1. **Raw Data view** — `src/components/RawDataView.js`
2. **Manage Classes** — `src/components/ManageClasses.js`
3. **HeatMap Dashboard** — `src/components/HeatMapDashboard.js`
4. **Analysis view** — `src/components/AnalysisView.js`
5. **Workspace / collaboration view** — `src/components/WorkspaceView.js`
6. **My Page / account** — `src/components/MyPage.js`

No screen was left partially migrated — every screen received a full pass over its JSX (headers, toolbars, filter chips, cards, tables, modals, empty/error/loading states).

## Screens partially migrated (and what's left)

None. All 6 target screens completed a full visual pass in this session.

## Sections/parts intentionally left unchanged (with reasons)

- **HeatMap Dashboard — interactive Maplibre map.** The reference mockup shows a static illustrative map image. The real app uses an interactive Maplibre GL map (pins, popups, heatmap layer, trail overlays, navigation/fullscreen controls). Per the "preserve current behavior" rule, the map itself (and its vendor-supplied controls like `NavigationControl`/`FullscreenControl`) were left functionally and structurally as-is; only the floating toolbar, legends, and info cards around the map were restyled to the new tokens (pill chips, `rounded-card`, `border-hairline`, `bg-surface`, etc.).
- **Workspace — free-form draggable canvas.** The mockup shows a simple flowing grid of report cards (`.canvas` with `.wcard`/`.note`), but the real app is a `react-rnd`-powered freeform drag/resize/attach canvas (charts + sticky notes, magnetic snapping, link-color tagging). This is a materially different interaction model than the static mockup implies, so the draggable canvas architecture, note-color palette, and chart/notes attachment system were preserved exactly; only chrome (card borders/radii, header/toolbar buttons, modals) was restyled to match tokens as closely as practical.
- **Post-it note color palette (Workspace)** and **AQI-band colors, group/trail legend colors, comparison chart palettes** (HeatMap/Analysis) — these are semantically meaningful, data-driven colors (note categories, health-threshold bands, per-group chart series) rather than decorative grays, so they were intentionally kept distinct from the neutral design-token palette, consistent with how the previous session handled AQI/status colors in Raw Data and Manage Classes.
- **Informational/status callout tints** (blue "info" boxes, amber "warning" boxes, green "success" text, purple/blue tag chips in Analysis quick-compare and My Page) were kept as semantic color tints rather than converted to neutral tokens, since they convey meaning (info vs. warning vs. success) the same way the mockup's own `--good`/`--mod`/`--usg` band colors do.
- **Shared navbar** (`src/App.js`) — out of scope per the task instructions (not one of the 6 listed files); still uses pre-existing styling.

## Files changed (per screen)

- `src/components/RawDataView.js` (prior session in this run)
- `src/components/ManageClasses.js` (prior session in this run)
- `src/components/HeatMapDashboard.js` — added `Button` import; restyled floating toolbar (metric chips, scope segmented control, heatmap toggle, city chips, accessibility toggle, save-map button) to pill/token styling; restyled `StatusInfoModal` (AQI criteria modal) header, cards, and close button.
- `src/components/AnalysisView.js` — added `Button` import; restyled page header + Overview/Compare segmented tabs; rebuilt the sticky filter/section-toggle bar into a two-row `filters`/`frow`/`segwide` pattern; restyled summary strip, outlier callout, all chart cards, quick-compare cards, CTA, and the `ComparisonModal`.
- `src/components/WorkspaceView.js` — added `Button` import; restyled header + toolbar (Build chart / Add note / Export selected / Export workspace / Delete) using the `Button` primitive with `primary`/`neutral`/`danger` variants; restyled canvas frame, `CanvasItem` chrome (card/header/select/textarea), and the "Build a chart" modal.
- `src/components/MyPage.js` — added `Button`/`Card` imports; rebuilt the whole page using `Card` for the profile card, quick actions, guide card, account settings, group members, and about card; converted the Edit Profile and Change Password modals to token-based inputs/selects and `Button` actions; removed a since-unused `Settings` icon import.

## Commits created (all local-only, on `feature/heatmap-analysis-overhaul`)

```
d11f247 ui: remove unused Settings import in MyPage
b4329f2 ui: migrate my page account screen
47f4357 ui: migrate workspace view screen
9907991 ui: migrate analysis view screen
992e054 ui: migrate heatmap dashboard screen
22a2273 ui: migrate manage classes screen
426269e ui: migrate raw data screen
ce96704 ui: land landing page + sensor explorer redesign   (prior session, for reference)
```

Nothing was pushed to any remote; all commits are local only and independently revertible via `git revert <hash>`.

## Build/lint/test results

- **Tests:** `CI=true npx react-scripts test --watchAll=false` — **9 test suites passed, 50/50 tests passed**, run after each screen and again as the final sanity check. One test (`AnalysisView.test.js`) initially broke because a button's accessible name was changed from "Compare Data" to "Compare data"; this was caught by the test run and fixed by reverting to the original "Compare Data" label so the test (and its `getAllByRole` assertion) continues to reflect true behavior.
- **Lint:** `ReadLints` on every touched file after edits — no new lint errors introduced. The dev server's live ESLint output shows exactly two **pre-existing** warnings, both from screens edited in the earlier part of this run (`ManageClasses.js` unused `GraduationCap` import, `RawDataView.js` `react-hooks/exhaustive-deps` on `rowInScope`) — left as-is per instructions ("pre-existing unrelated failures/warnings can be left as-is"). A similar unused-import warning introduced in `MyPage.js` (`Settings` icon, no longer rendered after the Account Settings header icon was dropped to match the mockup) **was fixed** in this session (commit `d11f247`).
- **Dev server / runtime check:** Both the frontend (`localhost:3000`) and backend (`localhost:3001`) dev servers were already running; both responded `HTTP 200` to a plain `curl` after all commits. The frontend's webpack dev output showed "Compiled with warnings" (the two pre-existing warnings above) and no compile **errors** after the final commit.

## Runtime errors encountered and how they were resolved

- No runtime/compile errors were introduced. The only regression was the test-name mismatch described above (not a runtime error, a test assertion on button text), fixed immediately.

## Visual mismatches still remaining vs. the reference mockup

- **HeatMap Dashboard:** the mockup's `#s-heat` section shows a flat illustrative map graphic with simple pin markers; the live app's interactive Maplibre map (satellite/vector tiles, real pin clustering, popups, trail lines) cannot match that flat illustration pixel-for-pixel — only the surrounding chrome was aligned to tokens.
- **Workspace:** the mockup's `#s-workspace` shows a fixed-flow grid of cards; the live freeform canvas (drag/resize/pan, sticky notes with 6-color palette, magnetic attach) is visually busier/more utilitarian than the mockup's tidy static grid, by design (functionality preserved).
- **Analysis "Recent" section quick-info popover** (`showReferenceInfo`) and a few teacher-only focus-period/group controls have no direct counterpart in the static mockup (which shows only the student view) — these were re-skinned with the same tokens but their layout is original to the app, not lifted from the mockup.
- Minor: exact pixel spacing/line-heights in Recharts-rendered charts (axis font sizes, tooltip shadow) were left using their existing inline styles (`AXIS_LINE_PROPS`, `contentStyle`) rather than fully re-implemented as SVG to match the mockup's hand-drawn chart SVGs, since Recharts renders real dynamic data and the mockup's charts are static illustrative SVGs.

## Places where functionality was preserved despite differing from the static mockup's presentation, and why

- HeatMap's interactive Maplibre map (see above) — preserving live map interactivity was required by the "preserve all existing functionality" constraint; the mockup's static map image is illustrative only.
- Workspace's freeform drag/resize/magnetic-snap canvas and multi-color sticky notes — collapsing this into the mockup's simple card grid would have been a product/architecture change (removing drag-and-drop, resize, and note-to-chart attachment), which is out of scope for a UI-only pass.
- AQI/health-threshold band colors, per-group/per-series chart colors, and status/semantic tints (info/warning/success) — kept distinct from neutral tokens because they encode real data meaning, matching how the mockup itself uses dedicated `--good/--mod/--usg/--unh/--vunh/--haz` CSS variables for the same purpose.
- All API calls, `useEffect`/`useMemo`/`useState` data flow, permission checks (`isTeacherRole`, `schoolEditable`, etc.), CSV import/export, filters, and routing/handlers across all 6 screens were left untouched — only `className`/JSX structure changed.

## Open questions that need the repo owner's decision

- **HeatMap map visual style:** should the interactive Maplibre style itself (basemap tiles, pin design) ever be swapped for something closer to the mockup's flat illustration, or is the current interactive map the intended long-term direction? (No action taken — flagged only.)
- **Workspace layout model:** does product intend to eventually replace the freeform drag/pin canvas with a simpler flowing grid (closer to the mockup), or is the freeform canvas the intended feature? This affects whether future redesign work should keep chasing the mockup's simpler layout or treat the current freeform canvas as the source of truth going forward.
- **Shared navbar** (`src/App.js`) still uses pre-migration styling since it was out of scope for this task; if a consistent look across the whole app is wanted, it will need its own migration pass.

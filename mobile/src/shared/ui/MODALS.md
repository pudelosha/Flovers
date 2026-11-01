# Application modal layout

Use `AppModalFrame` for every in-app form, confirmation and viewer. It owns the
full-area glass, Android Back handling, keyboard dismissal, close button and
navigation-safe host. `ContactModalFrame` remains a compatibility re-export.

- The host fills the application except the custom bottom navigation. Its height
  comes from `shared/constants/layout.ts`, also used by the tab bar.
- Nested existing hosts reserve navigation space once. Place nested dialog frames
  as siblings of their parent frame, never inside its scroll content.
- The background fills the host with square outer corners. The content body keeps
  the established 7% top gap and 24dp side insets (maximum body width 568dp).
- The X is anchored outside scrolling content at top 8dp/right 32dp of the body.
- Normal content scrolls to the host bottom with 20dp padding. Short dialogs use
  `centerContent` for symmetric 44dp top/bottom content space.
- Use `reserveBottomBar={false}` only for logged-out dialogs such as language
  selection. Do not manually deduct safe areas again inside form content.

The default frame supplies one ScrollView and an optional title. Keep actual
controls and validation in the feature component. Camera/photo editors with
specialized loading states or scroll interaction may use `scrollable={false}`
and their own ScrollView. In that case compose `appModalStyles.scroll` and
`appModalStyles.scrollContent` (plus `centeredContent` for short content), and keep
all header/field/action rows inside that scroll area. Preserve `scrollEnabled`
controls while dragging or zooming a photo. Do not add another height cap or
120dp footer spacer.

For nested confirmations, mount another AppModalFrame after the parent in the
same fragment and give it its own visibility/close callback. Closing a nested
confirmation must preserve the parent form and any unsaved changes.

Regression coverage: AppModalFrame tests exercise small/large frame configurations,
fixed close-button ownership, scrolling, centering and single footer reservation.
The architecture test prevents active modal components from restoring independent
frames. These are structural layout checks, not pixel screenshot baselines.
Perform on-device visual checks for keyboard, long translations/increased font
size, photo gestures, camera previews, nested confirmations and last-row menus.

Full-dialog loading must use the frame's `loading` prop. Its spinner is centered
against the complete modal panel, outside the padded/scrolling body. The body
stays mounted but hidden and noninteractive, allowing native image `onLoad` to
finish before revealing a full-photo viewer. Keep the X available while loading;
use the existing close callback to enforce any in-flight save guard. Button and
small subsection indicators can remain inline. Do not add a fixed-height spinner
placeholder to form content.

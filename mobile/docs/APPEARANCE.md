# App appearance

Profile offers Dark (default) and Light. Selecting a theme previews it immediately; Save synchronizes it with the account. The preference is cached locally. Missing server theme fields preserve the local choice for compatibility. Signed-out screens always use floral background 1. Signed-in Dark uses background 5; Light uses the dedicated `assets/bg-light.jpg` mint texture. Task and reminder cards fade from a pastel task-type colour on the left into white on the right.

`AppThemeProvider` derives appearance from authentication and settings. The context defaults to Dark for isolated components. Shared native UI adapters apply semantic foreground, surface, border and gradient roles without changing dimensions, animation values or event handlers. Dark retains original props and styles. Paper controls, calendar, date picker, sliders, switches and Android system bars follow the selected theme.

Photo captions retain white text with a subtle shadow. Image mask alpha and dark photo scrims remain unchanged. Plant data and notes use dark green text on light surfaces. Pop-up tile menus and FAB action menus retain their black appearance. Solid teal action buttons keep white labels. Red/blue photo framing guides retain their distinct colours. Modal geometry, scrolling space and close-button positions are shared between themes.

Backend migration `profiles.0020_profilesettings_theme` adds the `theme` field, defaulting to dark. Deploy it before relying on cross-device theme synchronization. Both dark and light are accepted by the settings API. Legacy background and tile_motive fields remain compatible with older clients; neither controls the current theme.

Validation includes palette contrast, image masks, button/menu contrast, shared controls and existing screen behavior. Android is built locally; iOS requires validation on macOS/device before release.

Light Plants list tiles use a simple image-to-white horizontal fade without the glare layer or image offset. Dark retains its original image treatment. Tile entry animations composite their child layers together in Light; card wrappers do not receive additional elevation, avoiding transient Android shadow frames.

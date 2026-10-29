Translation bundles live in:

- `mobile/src/i18n/locales/<language>`: app screens, modals and sharing.
- `web/src/locales/<language>`: website, documentation and policy pages.
- `backend/i18n/locales/<language>/email`: emails and notification text.

Indonesian (`id`), Russian (`ru`) and Turkish (`tr`) include every English bundle.
Language selectors use native names. Backend profile settings accept these codes;
apply the `profiles.0015_indonesian_russian_turkish` migration when deploying.

Run `python translations/validate_locales.py id ru tr` from the repository root
to check file coverage, JSON structure, interpolation tokens, markup and links.
This checks technical integrity, not translation fluency.

Plant catalogue names, descriptions and traits are separate database content,
seeded from `backend/plant_definitions/seed_data/plants`. These bundles do not add
catalogue translations; the API keeps its existing English fallback for missing
catalogue content. Scientific names and user-entered text are unchanged.

# Reviewed catalogue corrections

The frozen migration contains 3,571 leaf changes across 734 definitions. The
seed catalogue carries the same corrected values. Before/after checks make the
migration idempotent and stop an unexpected conflicting catalogue edit rather
than overwrite it. Existing user plants, reminder settings and tasks are not
modified.

The changes cover reviewed toxicity classifications and scope, toxicity text in
all 15 languages, specialist soil choices, seven corrected plant descriptions,
confirmed misting/feeding conflicts, soil-free air-plant repotting, and reviewed
pruning suggestions. Evidence and deferred cases are retained in the two
`catalogue_corrections_2026-11-09_*.json` manifests and original audit reports.

The mobile wizard now preserves long definition intervals instead of silently
clamping feeding to 90 days and repotting to 12 months. It supports the new
specialist soil choices and the pruning task type in all supported languages.

Uncertain taxonomy/source matches and season-dependent schedules remain review
candidates. Existing toxicity meanings that lacked new species-level evidence
were translated without claiming independent certification. Complete catalogue
description/trait translation backfills for Indonesian, Russian and Turkish are
not included; the toxicity labels and reviewed specialist profiles are included.

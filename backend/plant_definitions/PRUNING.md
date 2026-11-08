# Pruning backend contract

Backend support is additive. Mobile UI and the species recommendation dataset
are separate rollout stages. No migration or seed import creates pruning
reminders for existing user plants.

## Plant definitions

The definition profile API includes:

- `pruning_required`: boolean, default `false`; means that a recurring pruning
  reminder may be offered by the creation wizard, rather than a mandatory task.
- `pruning_interval_days`: optional whole number, 1–32767 days. Required when
  `pruning_required` is `true`; default `null`.

These fields are also editable in Django admin. A database constraint protects
the definition interval. The pruning recommendation filter is available in admin.

The `seed_plants` command accepts the same fields in species JSON files. If both
are absent, the importer preserves existing pruning guidance; a new definition
uses the model defaults. To update guidance, supply both fields explicitly:

```json
{"pruning_required": true, "pruning_interval_days": 90}
```

This is a schema example, not a recommendation for any particular species.
To remove a recommendation, use `false` and `null`. No catalogue files have been
reviewed or changed as part of this backend-only stage.

## User plants and reminders

Plant creation and detail APIs accept/expose `pruning_required` and
`pruning_interval_days`. These are the user's selections, separate from species
guidance. Old clients may omit them. Recommendations never silently enable tasks.

When `create_auto_tasks` and `pruning_required` are both `true`, plant creation
requires a positive pruning interval and creates one `pruning` reminder plus its
pending task, first due after that interval. Retrying a creation key cannot
duplicate it. Pre-pruning creation receipts remain valid when these fields are
omitted or use their defaults.

The reminder/task type key is `pruning` in both model and UI-facing filters.
The order is watering (`water` / `watering`), misting (`moisture`), fertilising
(`fertilize` / `fertilising`), pruning, care, and repotting (`repot`).

Pruning uses existing reminder scheduling, completion, postponement, undo,
shared-care permissions, XP limits and immutable completion history. Journal
filtering, task exports and bulk deletion accept `pruning`. Shared-completion
email and push messages have pruning labels in all 15 backend languages.

Deploy migrations before importing reviewed species guidance. Expose the new
task type in mobile only after backend support is deployed. No board firmware
changes are required.

**Account levels and XP — implemented rules**

XP is awarded by the backend when an eligible care task is completed. The mobile profile reads the live balance and level; it does not calculate or submit rewards and does not show XP award popups. There are no weekly bonuses and no automatic historical backfill. New progression starts at level 1 with zero XP. Apply the progression migration and deploy the backend before installing the updated mobile build.

**Ranks**

| Levels | Title | Badge |
| --- | --- | --- |
| 1–10 | Seedling | 🌱 |
| 11–20 | Sprout Keeper | 🌱 |
| 21–30 | Leaf Lover | 🍃 |
| 31–40 | Budding Gardener | 🌿 |
| 41–50 | Plant Nurturer | 🪴 |
| 51–60 | Green Thumb | 🌳 |
| 61–70 | Garden Guardian | 🌸 |
| 71–80 | Botanical Expert | 🌺 |
| 81–90 | Master Grower | 🏵️ |
| 91–100 | Plant Legend | 🏆 |

Titles and badges stay fixed inside each band. Level 100 is the maximum; there is no level 101 target. Labels and rank titles are localized in all 12 app languages.

**Earning rules**

Use diminishing rewards per account per server UTC day, independent of the number of plants:

| Eligible task completed that day | XP |
| --- | ---: |
| First | 100 |
| Second | 50 |
| Third | 30 |
| Fourth | 20 |
| Fifth through ninth | 10 each |
| Tenth onward | 0 |

The daily ceiling is 250 XP. Large collections do not multiply the ceiling, and adding plants never reduces the reward for the first task. A user with one eligible completion earns 100 XP; one with 100 eligible completions earns 250 XP, not 10,000. This rewards consistency while keeping all care tasks available after the XP ceiling.

Only newly completed, server-validated due or overdue care-task occurrences qualify. Early completion may remain allowed by existing business rules, but awards zero XP. Exclude scheduling, editing, imports, automatic/device watering and raw sensor messages.

**Progression curve**

From current level L, the next level costs 100 × L XP for levels 1–10. After level 10, it costs 1,000 + 25 × (L − 10) XP. The first eligible task awards 100 XP and reaches level 2. Titles and badges change only at the listed rank boundaries.

| Target | Total XP | Earliest at 250 XP/day | At one eligible task/day |
| --- | ---: | ---: | ---: |
| Level 5 | 1,000 | 4 earning days | 10 earning days |
| Level 6 | 1,500 | 6 earning days | 15 earning days |
| Level 10 | 4,500 | 18 earning days | 45 earning days |
| Level 11 | 5,500 | 22 earning days | 55 earning days |
| Level 50 | 64,000 | 256 earning days | 640 earning days |
| Level 100 | 194,625 | 779 earning days | 1,947 earning days |

These are uninterrupted earning days, not guaranteed calendar timelines. Someone caring for a small collection only a few days per week progresses more slowly. At the daily ceiling, level 100 takes about 2.1 years; three eligible tasks every day take about 3 years. The level is capped at 100 and the next-level target is zero at that maximum.

**Integrity rules**

1. Award at most once per immutable task occurrence, with a unique ledger identity. Store zero-XP decisions too. Repeated requests, repeated completion, retries and stale clients cannot re-award.
2. Also limit positive awards to one per user/plant/care-type/server-day. Deleting and recreating the same reminder must not generate repeated rewards for the same day's care.
3. Use server receipt time for the UTC earning day, daily ordinal and cap, never the user-supplied completion date. Due-date eligibility uses the server's configured care calendar (currently Europe/Warsaw), matching the existing task schedule. Profile timezone edits do not reset the quota.
4. Keep the ledger when task history, reminders or plants are deleted. Those models currently cascade, so a cascade-only task counter is insufficient. Preserve deduplication identities without retaining deleted display content; account deletion should still erase the account's XP data.
5. Task completion, unique-award insertion, daily quota and balance updates must be atomic under an account progression lock. Concurrent completions must not bypass 250 XP/day.
6. If undo is added, reverse the original award once and preserve its identity; completing again must not create a new daily reward. Define how reversals interact with daily quota before shipping undo.
7. Do not backfill historical completions automatically. Historical data is deletable and backdateable, so any later backfill needs a separate bounded policy.

The existing completion method already locks tasks and ignores duplicate completion, but it immediately spawns the next occurrence and permits early completion. XP therefore must not be based only on the count of completed rows.

**API and storage**

An account progression row stores total XP and an award ledger retains task decisions and daily care slots. The authenticated, read-only GET /profile/progression/ endpoint returns the existing profile API envelope with total_xp, level, rank_key, xp_into_level, xp_for_next_level, daily_xp and daily_cap. It returns only the authenticated account's data. Clients cannot PATCH/POST a balance or choose an account ID. The mobile profile refreshes on focus and foreground return without XP notifications.

**Verification**

Cover all 10 rank bands, loading/unavailable states, live progress, level 100, account switching, screen-reader progress semantics and existing account actions. Backend checks cover actual task completion, diminishing rewards and the daily cap, duplicate/early/backdated requests, UTC boundaries, deletion retention, authorization, level thresholds, migration consistency and concurrent PostgreSQL completions where PostgreSQL is available.

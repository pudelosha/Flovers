# Catalogue audit — 8 November 2026

All **734 plant definitions** were screened for toxicity, recommended growing media and containers, task flags and intervals, translation coverage, source identity, and mobile consumption of those values. This is an audit, not an applied correction set. No definitions, user plants, reminders or production records were changed during this audit.

There are serious confirmed problems. There are also substantial evidence gaps. **Screening all 734 records does not mean every plant has been independently cleared for toxicity or every care interval botanically validated.** Records without a listed error are not certified correct.

## Files to review

- [One row for each of the 734 plants](plant_review_matrix.csv): current toxicity text, soil/container codes, task settings, evidence-review status, finding IDs and source-identity flags. UTF-8 CSV files include a BOM for Excel.
- [All findings in a filterable spreadsheet](findings.csv): current values, severity, classification, proposed action and sources. Filter by `classification` before treating a row as a correction.
- Topic reports: [toxicity](toxicity.md), [soil and containers](soil_container.md), [tasks and intervals](task_recommendations.md).
- Topic JSON files include individual evidence and all 734 coverage entries: [toxicity](toxicity.json), [soil/container](soil_container.json), [tasks](task_recommendations.json).
- [Reproducible structure/app checks](audit_structure.py), [structure findings](structure.json), [source identity flags](source_identity_flags.json), [live/draft comparison](live_drift.json).

The combined spreadsheet contains **1,606 finding instances**, not 1,606 proven botanical errors. This includes 734 repeated translation-coverage issues, 500 interval-control truncations, and deliberately marked review candidates. Do not sum those rows into a count of incorrect species.

## Priority 1 — toxicity labels

The expanded review found **134 toxicity/scope/translation/source findings across 129 plants**:

| Finding | Records | Interpretation |
|---|---:|---|
| Unqualified “Non-toxic” label conflicts with reviewed hazard evidence | 16 | Correct the safety claim with appropriate species, subject, route and plant-part scope. Some evidence is genus/infraspecific guidance, which is identified in the topic report. |
| Non-toxic wording needs dose, route or uncertainty qualification | 15 | Review the scope; this does not mean every culinary herb should be labelled a severe poison. |
| Pet warning omits a separately documented human hazard | 42 | The existing pet warning may be true; it is not a complete toxicity assessment. |
| Positive toxicity claim not substantiated in reviewed evidence | 2 | Keep unresolved. Lack of evidence must not be converted into “Non-toxic”. |
| Pet-toxicity claim contradicted by an explicit veterinary classification | 1 | Correct rosemary's pet classification; do not extend the live-plant classification to concentrated extracts. |
| ASPCA reference does not establish the catalogue plant's scientific identity | 34 | Replace or qualify the source; a different-species link alone is not grounds to reverse the toxicity label. |
| Polish/Hindi translation-quality issues | 13 / 5 | Correct wording after confirming the intended safety meaning. No clear polarity inversion was established. |

The other six findings concern pet-safe versus human-specific hazards, weak contact-dermatitis tags, and a genus-level review. They are not six additional proven poisoning-label errors.

The most urgent example is **Leucojum vernum**: the definition currently says **“Non-toxic”**, while its matching NC State profile describes high-severity ingestion poisoning affecting humans and pets. This is a direct safety-label contradiction. [NC State species profile](https://plants.ces.ncsu.edu/plants/leucojum-vernum/)

Other affected definitions include **Heptapleurum actinophyllum**, **Ledebouria socialis**, **Plumbago auriculata**, **Podocarpus macrophyllus** and several **Pelargonium** entries. Their risks differ; do not replace all of their labels with the same severity or infer that contact, ingestion, humans and pets are interchangeable. Exact evidence and qualifications are in [toxicity.md](toxicity.md).

The opposite-direction correction is **Rosmarinus officinalis**: the current “Toxic to pets” label conflicts with ASPCA's explicit non-toxic classification for dogs, cats and horses. Its synonym **Salvia rosmarinus** already has different wording. [ASPCA rosemary](https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/rosemary). The [synonym consistency appendix](synonym_consistency.json) records four verified name-pair spot checks; differing optional pot choices are not automatically errors.

For **Sarracenia purpurea** and **Nymphaea alba**, the existing positive poisoning claims remain unverified in this review. They are not declared harmless. Likewise, a horticultural page with no poison section is not a non-toxic classification.

Toxicity coverage explicitly remains incomplete: 295 records have an unresolved safety assertion, 151 lack matching evidence, and 50 have a reviewed matching profile that does not support a toxicity conclusion. Another 34 have a verified pet classification with other scopes still open. There are 161 records with reviewed species hazard evidence, 42 with explicit pet-hazard classifications, and one with group/extension hazard evidence. These statuses are recorded individually and are not safety clearances.

## Priority 2 — intervals are changed by the app

These are confirmed software/data integration defects, independent of horticultural judgement:

- **494 definitions** recommend repotting after more than 12 months: 438 at 24 months, 31 at 18, 15 at 36, nine at 30 and one at 48. `CreatePlantProvider` caps the recommendation at **12**, and the Step06 repotting slider also has `max={12}`. A valid two-year recommendation therefore becomes annual repotting in a newly configured plant.
- **Six fertilising intervals** exceed the wizard's 90-day cap: *Allium schoenoprasum* (180), *Calycanthus floridus* (365), *Ceropegia woodii* (120), *Cupressus macrocarpa* (365), *Cupressus sempervirens* (120), *Echinacea angustifolia* (365). They are shortened to 90 days.

All six fertilising records are already included among the 494 repotting records. There are **500 affected field values across 494 distinct definitions**, not 500 distinct plants.

References: `mobile/src/features/create-plant/context/CreatePlantProvider.tsx`, the `SET_FERTILIZE_INTERVAL` and `SET_REPOT_INTERVAL_MONTHS` reducers; `mobile/src/features/create-plant/steps/Step06_AutoTasks.tsx`, the sliders and recommendation initialization. Preserve the reviewed definition interval; do not shorten the data merely to fit an existing control.

## Priority 3 — task recommendations

The task review contains 220 findings across 195 plants. Confirmed conflicts, missing context and review candidates are separate statuses.

- **Sarracenia purpurea:** generic fertilising is enabled every 30 days, directly conflicting with the species guidance. Disable that generic automatic suggestion; this is not a statement about every specialist feeding technique for every carnivorous genus. [NC State](https://plants.ces.ncsu.edu/plants/sarracenia-purpurea/)
- **Streptocarpus ionanthus:** misting every five days conflicts with keeping the foliage dry. The synonymous **Saintpaulia ionantha** record already disables misting; these duplicate care profiles disagree. [NC State](https://plants.ces.ncsu.edu/plants/streptocarpus-ionanthus/)
- **Sinningia speciosa** and **Cyclamen persicum:** generic foliar misting conflicts with the reviewed foliage/crown guidance. Storage-time tuber moistening is a different operation.
- **Adiantum capillus-veneris:** feeding is disabled although container-culture guidance supports offering it. The evidence does not establish an exact replacement interval.
- **Lithops:** a repeating 14-day watering task lacks essential dry growth phases. Replacing 14 with another single number would not resolve this.
- **18 annual/one-season cultivation entries** need lifecycle-aware repotting review. This is conditional, not 18 automatically false flags; some plants, including *Tropaeolum majus*, can be perennial in suitable conditions.

There are 148 enabled misting suggestions, 486 seven-day watering defaults and 631 thirty-day fertilising defaults. These counts expose how much advice is based on generic schedules, but **do not prove every such value wrong**. In particular, high ambient humidity is not sufficient evidence for recurring leaf spraying. All 148 misting entries are review candidates; three explicit misting conflicts and one fertilising conflict were established in the task review.

The field `moisture_required` really creates a **Misting** task, not a sensor reading or a soil-moisture check. `false` disables an automatic wizard suggestion; it does not prohibit a user from creating that task manually. Pruning flags require the same distinction: seasonal or as-needed pruning does not automatically justify a fixed days-based reminder. The 14 local positive pruning intervals remain editorial starting cadences, not numbers prescribed by their sources.

Feeding frequency also depends on concentration, growth phase and method. For example, monthly versus twice-yearly feeding can require regimen review rather than an unconditional arithmetic correction. The JSON preserves this distinction.

## Priority 4 — soils and containers

There are **18 explicit plant findings**: ten corrections, five missing constraints, two specialist reviews and one source disagreement.

| Example | Current problem | Direction |
|---|---|---|
| *Tillandsia ionantha*, *T. usneoides* | Ordinary cactus/general potting mixes for soil-free air plants | Introduce a no-soil/mounted regime; remove ordinary soil recommendations. |
| *Nymphaea alba* | Indoor multipurpose/green-plant mixes despite aquatic culture | Represent aquatic medium and container configuration. |
| Six carnivorous definitions | Existing codes do not reliably express the necessary nutrient, aeration and chemistry constraints | Add suitable specialist media choices; do not treat all carnivores identically. |
| *Helleborus niger* | An acidic alternative conflicts with preferred soil chemistry | Remove the inappropriate acidic suggestion. |
| Gardenia, bilberry and rhododendrons | Generic alternatives do not preserve an acidity requirement | Qualify or remove the generic alternative. |

For the air-plant distinction, see [RHS air-plant guidance](https://www.rhs.org.uk/plants/types/houseplants/air-plants). **Tillandsia cyanea / Wallisia cyanea is intentionally a separate specialist review**, not automatically grouped with the soil-free species above.

All existing recommendation codes match the **actual** mobile selectors. An outdated TypeScript union is not the live options list. No invalid soil/container code was found.

`peat-free` appears in 104 records but identifies an attribute, not a complete growing-medium recipe. Eighty succulent/general-mix combinations need product/context review; they are not 80 proven mistakes. Plastic or ceramic alone does not establish bad drainage: pot holes, reservoir, geometry, size and mounting are absent from the current recommendation model. A wholesale replacement with terracotta would introduce new errors. Conflicting guidance for *Daphne mezereum* is recorded without an automatic correction.

## Evidence quality and language coverage

- The task and soil reviews found 377 and 378 matching NC State profiles respectively. The toxicity review examined 406 retrieved NC State pages, plus the identified veterinary/extension sources. Matching a page does not validate every claim or exact interval on that record. Other primary species/group sources were used where identified in the findings.
- All 106 existing ASPCA references were checked (66 unique URLs): 67 establish species/synonym/parent/genus identity at the stated scope, 34 do not establish identity, and five are general articles/index pages. The expanded review supplies explicit pet classifications for 90 catalogue definitions (59 toxic, 31 non-toxic); 48 use explicit genus guidance, so this is not 90 independently verified species assessments.
- The previous `source_quality_qa.md` grades source **domains**. It is not a botanical fact-check. The source-heading screen flagged **311 links across 284 definitions** where identity was not established. Some are legitimate common-name/group pages; others are clearly unrelated species. These flags must not all be called broken or wrong links.
- All 734 definitions contain 12 languages for descriptions and traits. **Indonesian, Russian and Turkish are missing from these definition data**, including toxicity warnings. Application-level translations do not fill this data gap. Correct the reviewed meaning consistently across all languages, rather than updating English alone.

## Live database versus local drafts

A read-only PostgreSQL transaction retrieved all 734 live definitions. Comparison by Latin identity, with the importer's trait-key normalization applied, found **13 real draft/live differences**, all in the un-deployed positive pruning fields. Coleus already matches after its earlier targeted update. The remaining audited toxicity, soil, container and non-pruning task values match the live catalogue. Sixteen external-ID differences are expected importer punctuation normalization, not missing plants.

See [live_drift.json](live_drift.json). No user plant records or personal data were queried. Seed SHA-256 fingerprints in the matrix identify the audited local snapshot.

## Recommended correction sequence

1. Correct the evidenced unsafe safety labels and explicit harmful task suggestions, preserving subject/route/part distinctions and updating every language. Fix the interval caps in the same release so valid data survives the wizard.
2. Correct the evidenced growing-medium errors and add the missing specialist regimes before mapping definitions to new option codes. Keep uncertain cases out of bulk automatic rewrites.
3. Add internal growth-phase/lifecycle/method support where a fixed interval cannot represent care correctly. Choose reviewed editorial starting intervals only after these constraints are expressible.
4. Resolve the per-species evidence gaps and source-identity flags. Record field-level provenance and review status; do not declare unknown plants safe or enable pruning merely to fill a field.

This sequence proposes data and logic corrections. It does not require adding unrequested care tips to the wizard UI.

## Reproducing and validating the report

Run `python audit_structure.py` from this directory (or supply its full path) to regenerate the read-only structural checks. Run `python combine_reports.py` after the three topic JSON reports exist to regenerate the combined findings and 734-row matrix. Topic source judgements are authored reviews; these scripts do not pretend to reproduce a botanical expert assessment from keyword matches.

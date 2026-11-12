# Task recommendation audit — 8 November 2026

All **734** records were scanned. **377** have an identity-matched NC State species description in the reviewed corpus; **357** do not. A matched source is not the same as verification of every flag or exact numeric interval. No seeds or production records were changed.

## Priority corrections

- **Sarracenia purpurea:** fertilizer enabled every 30 days directly conflicts with species guidance. Disable the generic fertilizer recommendation.
- **Streptocarpus ionanthus:** foliage-misting enabled every five days despite keep-leaves-dry guidance. Its synonym **Saintpaulia ionantha** already has misting off, exposing contradictory duplicate care profiles.
- **Sinningia speciosa** and **Cyclamen persicum:** repeated foliar misting is unsafe as a generic recommendation. Dormant-tuber moistening is not equivalent to spraying foliage.
- Both **Lithops** definitions prescribe watering every 14 days while essential dry growth phases are absent. Another fixed number cannot fix this.
- **Adiantum capillus-veneris:** disabled fertilizer omits a feeding suggestion supported for container cultivation. The evidence does not establish an exact interval.
- **18 annual species** have recurring repotting after 12–24 months. This is different from seedling potting-on and should normally be disabled for a one-season crop/display.
- Feeding defaults for **ZZ plant, Ficus binnendijkii, Sedum morganianum** differ substantially from reviewed species regimens. Choose a formulation and active-growth policy before assigning replacement numbers. More frequent dilute applications are not automatically an error.
- **Nepenthes** and **Pinguicula moranensis** require specialized feeding methods and growth-phase handling. Do not indiscriminately classify all carnivorous plants as never fertilizable.

## Catalogue-wide limitations

- **148** definitions enable a recurring misting task. High ambient humidity alone does not justify that task. This is a review queue, not a claim of 148 individually proven errors.
- **486** definitions use seven-day watering; **631** use 30-day feeding. These can only be starting reminders, not universal instructions to water or fertilize without checking conditions.
- **719** definitions enable repotting. Container culture, root crowding, growing medium and lifespan are not represented by one global flag.
- The existing pruning review differentiates no automatic suggestion from no pruning ever. Seasonal roses, shrubs and vines must not be assigned arbitrary fixed-day pruning merely to enable the checkbox.

## Selected primary evidence

- [Sarracenia — NC State](https://plants.ces.ncsu.edu/plants/sarracenia-purpurea/)
- [African violet — NC State](https://plants.ces.ncsu.edu/plants/streptocarpus-ionanthus/)
- [Gloxinia — NC State](https://plants.ces.ncsu.edu/plants/sinningia-speciosa/)
- [Cyclamen — Iowa State](https://yardandgarden.extension.iastate.edu/how-to/all-about-cyclamen)
- [Lithops — University of Wisconsin Extension](https://hort.extension.wisc.edu/articles/living-stones-lithops/)
- [ZZ plant — NC State](https://plants.ces.ncsu.edu/plants/zamioculcas-zamiifolia/)
- [Maidenhair fern — NC State](https://plants.ces.ncsu.edu/plants/adiantum-capillus-veneris/)
- [Tropical butterworts — UC Davis](https://conservatory.ucdavis.edu/collections/carnivorous/pinguicula)
- [Carnivorous cultivation — US Botanic Garden](https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants)
- [Misting and humidity — Iowa State](https://yardandgarden.extension.iastate.edu/faq/air-our-home-extremely-dry-winter-should-i-mist-houseplants)

## Reading the JSON

`findings` distinguishes confirmed conflicts, missing growth-phase support, regimen comparisons and group-level review candidates. `coverage` lists every plant, current flags/intervals, matched source identity, prior pruning status and linked findings. Lack of a finding means unresolved or no contradiction established in this scope; it does not certify the data as correct.

```json
{
  "plants": 734,
  "species_description_available": 377,
  "species_description_gap": 357,
  "findings": 220,
  "plants_with_findings": 195,
  "findings_by_status": {
    "confirmed_source_conflict": 4,
    "confirmed_missing_growth_phase": 35,
    "source_cadence_mismatch_requires_regimen_choice": 3,
    "confirmed_missing_optional_suggestion": 1,
    "confirmed_schema_limitation_group_guidance": 2,
    "confirmed_schema_limitation_species_named_in_group_guidance": 1,
    "confirmed_internal_contradiction": 2,
    "lifecycle_context_review": 18,
    "source_cadence_review_candidate": 5,
    "group_guidance_review_candidate_not_148_confirmed_errors": 148,
    "context_dependent_flag_review_candidate": 1
  },
  "findings_by_severity": {
    "high": 12,
    "medium": 208
  },
  "misting_enabled": 148,
  "monthly_fertilizer": 631,
  "weekly_watering": 486,
  "repot_enabled": 719,
  "structural_errors": 0
}
```

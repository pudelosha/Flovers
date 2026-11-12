# Soil and container audit — 2026-11-08

All **734** seed records were checked. **378** have a matching NC State species profile in the retrieved corpus. This is source coverage, not certification of every potting recommendation. No seed or production value was changed.

The audit distinguishes confirmed corrections, missing constraints, specialist review and source disagreement. The complete JSON contains a coverage row for every plant and current values for each finding. Container materials themselves are not treated as proof of good or bad drainage.

| Severity | Plant | Finding | Status |
|---|---|---|---|
| high | Tillandsia ionantha | Air plant offered ordinary potting media | confirmed_correction |
| high | Tillandsia usneoides | Air plant offered ordinary potting media | confirmed_correction |
| high | Nymphaea alba | Aquatic plant mapped to houseplant compost | confirmed_correction |
| high | Nepenthes alata | Nepenthes medium is not described by current generic codes | confirmed_correction |
| high | Nepenthes rafflesiana | Nepenthes medium is not described by current generic codes | confirmed_correction |
| high | Dionaea muscipula | Acid-loving compost is not equivalent to carnivorous-plant medium | confirmed_correction |
| high | Drosera capensis | Acid-loving compost is not equivalent to carnivorous-plant medium | confirmed_correction |
| high | Sarracenia purpurea | Acid-loving compost is not equivalent to carnivorous-plant medium | confirmed_correction |
| high | Pinguicula moranensis | Mexican butterwort incorrectly reduced to acid/cactus compost | confirmed_correction |
| medium | Helleborus niger | Acid-loving recommendation contradicts preferred soil chemistry | confirmed_correction |
| medium | Gardenia jasminoides | Unqualified generic alternative omits required acidity | confirmed_constraint_gap |
| medium | Vaccinium myrtillus | Unqualified generic alternative omits required acidity | confirmed_constraint_gap |
| medium | Rhododendron ponticum | Unqualified generic alternative omits required acidity | confirmed_constraint_gap |
| medium | Rhododendron simsii | Unqualified generic alternative omits required acidity | confirmed_constraint_gap |
| medium | Damasonium alisma | Peat-free alone does not describe an aquatic substrate | confirmed_constraint_gap |
| low | Daphne mezereum | Acidity guidance differs among authoritative sources | source_conflict_review |
| medium | Tillandsia cyanea | Pink quill needs a separate bromeliad-medium review | specialist_review_needed |
| medium | Paphiopedilum insigne | Slipper orchid treated as interchangeable with ericaceous mix | specialist_review_needed |

## Important limits and next changes

- Introduce separate carnivorous, aquatic and mounted/no-soil growing regimes. Existing selectable mixes cannot accurately express them.
- Treat `peat-free` as a separate formulation attribute. Its presence does not establish low nutrients, acidic pH or drainage.
- Generic alternatives require qualification for strict acid-lovers; specialist orchid mixes need epiphytic/terrestrial distinctions.
- The catalogue has 80 records offering both a succulent mix and a generic alternative. These are review candidates, **not 80 proven wrong plants**: suitable amended multipurpose recipes can exist.
- Do not turn a single pH label into an automated correction: Daphne mezereum has different tolerances in authoritative sources. Likewise Erica carnea tolerates lime; its acidic preference is not itself a defect.
- A remaining source gap is unresolved, never a horticultural pass. No universal change to ceramic/plastic/terracotta recommendations is justified by this audit.

## Sources used for the specialist decisions

- https://conservatory.ucdavis.edu/collections/carnivorous/pinguicula
- https://plants.ces.ncsu.edu/plants/daphne-mezereum/
- https://plants.ces.ncsu.edu/plants/helleborus-niger/
- https://plants.ces.ncsu.edu/plants/rhododendron-ponticum/
- https://plants.ces.ncsu.edu/plants/tillandsia-ionantha/
- https://plants.ces.ncsu.edu/plants/tillandsia-usneoides/
- https://woodyplants.cals.cornell.edu/plant/80
- https://www.botanic.cam.ac.uk/the-garden/plant-list/helleborus-niger/
- https://www.nparks.gov.sg/florafaunaweb/flora/2/5/2514
- https://www.osgb.org.uk/orchids/orchid-care-guides/paphiopedilum-orchid-care
- https://www.rhs.org.uk/plants/158329/damasonium-alisma/details
- https://www.rhs.org.uk/plants/18701/vaccinium-myrtillus/details
- https://www.rhs.org.uk/plants/5331/daphne-mezereum/details
- https://www.rhs.org.uk/plants/gardenia/how-to-grow
- https://www.rhs.org.uk/plants/rhododendron/indoor-azaleas
- https://www.rhs.org.uk/plants/types/carnivorous/growing-guide
- https://www.rhs.org.uk/plants/types/houseplants/air-plants
- https://www.rhs.org.uk/plants/waterlilies/growing-guide
- https://www.usbg.gov/gardens-plants/cultivating-carnivorous-plants

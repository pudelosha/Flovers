# Image-handling policy updates — 30 October 2026

Updated the Terms of Service and Privacy Policy in all 15 supported languages. Existing unrelated legal provisions were preserved. Both pages display an update date of `2026-10-30`.

The new clauses describe the implemented image flows:

- Optional uploads from the plant wizard and image editor; older local photos require an explicit upload choice.
- User ownership and the existing limited service licence, including the rights needed to upload/share content and respect for other people's privacy.
- Resizing, compression, thumbnails, orientation correction and removal of embedded EXIF/GPS. Originals are not retained as a permanent archive.
- Private image access for the owner and authenticated users with active plant-sharing access, plus necessary authorised technical processing. Only owners can change/remove images.
- Replacement, removal and plant/account deletion end access to the previous photo and queue file cleanup. Failed cleanup is retried. Conditional backup wording does not invent an unverified fixed retention period.
- Temporary session caching, cache clearing on logout, and the limits of revocation for screenshots or copies already held elsewhere.
- Image content, plant/account associations and technical image metadata as data categories, with storing/synchronising/displaying photos as processing purposes.
- Separate treatment of recognition-only submissions. Saved plant photos are not automatically submitted for recognition or used for model training.
- Optional uploads and applicable format, size, storage and rate limits. A rejected replacement preserves the current image.

The Terms also clarify that a plant QR code or photo address alone grants no access. Device authentication secrets remain confidential.

## Source-verified corrections

The old EU ODR platform link was replaced with current European Commission consumer-redress information. The platform was discontinued on 20 July 2025 under [Regulation (EU) 2024/3228](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R3228); the Commission now directs users to its [consumer-redress information](https://consumer-redress.ec.europa.eu/site-relocation_en).

The Privacy Policy's blanket statement that personal data are never processed outside the EU was narrowed. Account data and photo files are hosted on the EU VPS, while notification-related processing through Firebase Cloud Messaging can use global infrastructure. This distinction follows [Firebase's location information](https://firebase.google.com/support/privacy) and [data-processing terms, section 10](https://firebase.google.com/terms/data-processing-terms). The revised text does not assert that a particular project agreement or transfer safeguard has been independently verified.

[GDPR Article 13](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32016R0679) informs the disclosure of processing purposes, categories of recipients, retention periods or criteria, and relevant international transfers. These source changes describe implementation behavior; they do not certify overall legal compliance.

## Operational follow-up

The controller should confirm the actual Firebase agreements and applicable transfer safeguards for the production project. An off-server photo backup destination and retention schedule have not been configured by this task. If recovery backups are introduced, their actual rotation and deletion arrangements should be documented and reflected in the notice. No fictitious 30-day or other fixed backup promise has been added.

## Validation

All 30 policy JSON bundles have matching required image-clause keys. Rendering tests load the actual Terms and Privacy routes with fallback disabled for each language, verify that every new clause appears, confirm the update dates, and check removal of the retired ODR URL. Existing website regression tests remain included.

No live policy publication, commit or deployment was performed as part of this update.

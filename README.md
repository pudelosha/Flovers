<p align="center">
  <img src="web/public/favicon.png" width="88" alt="Flovers logo" />
</p>

# Flovers — Your plants. Your routines. A little help from friends.

Flovers brings your plant collection, daily care, progress photos and live sensor readings into one mobile app. Know what needs attention, keep a record of what you have done, and let someone you trust care for your plants while you are away.

Use it with a few houseplants or connect an ESP32 for sensor monitoring and controlled watering. Devices are optional: plants, reminders, photos and shared care work without them.

**[Website](https://flovers.app/) · [User guide](https://flovers.app/en/docs) · [Wiring diagrams](https://flovers.app/en/schemas) · [Deployment guide](deployment/README.md)**

<p align="center">
  <img src="https://github.com/user-attachments/assets/79019890-31c7-453f-a501-3e77b25348a2" width="19%" alt="Plant collection" />
  <img src="https://github.com/user-attachments/assets/528d751c-63f8-4fa9-a6ff-3cf83311d431" width="19%" alt="Create a plant" />
  <img src="https://github.com/user-attachments/assets/648f8172-82ed-442e-a9d5-4c5541d8bbbb" width="19%" alt="Care reminders" />
  <img src="https://github.com/user-attachments/assets/73dd438b-2096-43d4-b5f7-90868caa5121" width="19%" alt="Profile and preferences" />
  <img src="https://github.com/user-attachments/assets/8472819a-94a8-4d01-b0f2-8a1fe414340f" width="19%" alt="Plant care controls" />
</p>

## What you can do

### Build a collection that feels like yours

- Create plants through a guided wizard, with or without a linked species definition.
- Record nicknames, locations, purchase dates, notes, light conditions, orientation, distance from a window, pot material and soil mix.
- Identify a plant from a camera or gallery photo and use the linked catalogue information to help set up its care.
- Take or upload your own plant photo, then **pan and zoom its framing** with previews for list tiles and Plant details.
- Fall back to the catalogue photo when no personal photo is provided.
- Generate, save or email plant QR codes. Scan a code to open a plant you own or have permission to view.

### Turn care into a manageable daily routine

- Create recurring reminders for **watering, misting, fertilising, repotting and general care**.
- Use **Home as a task list or calendar**, switching through the FAB menu or a horizontal swipe.
- See actual pending tasks on their current due dates, including overdue, postponed and shared tasks. The calendar does not invent future repetitions.
- Complete tasks individually or complete the eligible tasks currently visible, with optional notes and a completion date.
- **Postpone one task** until tomorrow, in two or three days, or a chosen later date without changing the recurring reminder definition.
- **Undo an eligible completion** from Task Journal. The owner can restore the task, remove its untouched successor and reverse the completing person's XP. Later edits or activity prevent unsafe undo.
- Sort and filter your tasks and manage recurring reminder rules separately in Reminders.

The next recurring task is calculated from the chosen completion date and the reminder interval. Undo is available for eligible completions recorded after its backend update; older entries lack the safety record needed to restore them reliably.

### Share care, not account credentials

- Add contacts using an email address or **Flovers ID**, and manage incoming and outgoing requests.
- Invite someone who does not yet have Flovers by email, choosing the invitation language.
- Share one plant or select several together when preparing for a holiday.
- Give each contact **read-only access or permission to complete tasks**. Reminder definitions and plant editing stay with the owner.
- Set an optional access end date, revoke one person's access, or remove a plant's sharing for everyone while keeping the plant.
- View shared plants, permitted readings and care history. Shared labels distinguish them in the main screens.
- Let caregivers use QR scanning for plants they can access.

### Keep a visual care journal

- Review completed tasks with their date, notes and **who completed them**.
- Add a development photo **once every seven days per plant**, with an optional photo date and note.
- Mix photo entries and completed care tasks in one **Task Journal**, with filters, sorting and server-side pagination.
- Open a full photo without the tile gradient and move between that plant's photos with Previous and Next.
- Let owners add, edit and delete journal photos while shared viewers can see them.
- Email task-history exports as spreadsheets.

Personal photos are resized and compressed for mobile use, stored privately on the server and accessible only to the owner and people with active sharing access. Replacing or removing a photo cleans up unused files. See [private photo storage and backups](deployment/PRIVATE_PHOTOS.md).

### Add live readings and watering hardware

- Link a device to a plant and choose sensors for **temperature, air humidity, light and soil moisture**.
- View current readings and explore **day, week and month charts**.
- Set the expected reading interval. A device tile pulses red when readings become overdue, with optional email and push alerts.
- Configure low-moisture alerts and optional automatic watering thresholds.
- Schedule or recall manual pump watering, choosing a duration from **1 to 300 seconds**.
- Set the automatic pump duration in device settings for the generated firmware; manual watering and automatic watering have separate duration rules.
- Generate and email device-specific Arduino/ESP32 sample code from the app.

Device settings embedded in generated firmware require regenerating and uploading the code to the board. Compatible firmware includes HTTPS certificate verification, cooldown safeguards and protections against repeating a watering job after retries.

### Grow your gardening profile

- Earn XP from completed care tasks and progress through **levels 1–100 and ten gardening ranks**, from Seedling to Plant Legend.
- Reach early levels quickly, with increasing XP requirements for later levels.
- Keep progression fair through daily limits, diminishing rewards and per-plant care checks.
- See your current level and progress in Profile without XP pop-ups interrupting care.
- Personalise language, temperature units, date format, background, tile appearance and FAB position.

### Choose the notifications you need

- Configure email and push notifications independently, including reminder delivery times.
- Choose whether due tasks for shared plants are included in your reminders.
- Opt in to notifications when another person completes a task for a plant you share.
- Configure device alerts for low soil moisture and missing readings.

### Use Flovers in your language

The mobile app, backend messages and website support **15 languages**:

English, Polish, German, Italian, French, Spanish, Portuguese, Arabic, Hindi, Chinese, Japanese, Korean, Indonesian, Russian and Turkish.

## Recent improvements

- **Home calendar:** moved from Reminders to the screen where tasks are completed; selected-day circles and coloured dots keep it compact.
- **Task postponement and safe undo:** correct a task's timing or an accidental completion without silently overwriting later care.
- **Contacts and shared plants:** help someone look after your collection with explicit access permissions.
- **Task Journal:** combined care history and progress photos, full-photo navigation and paginated loading.
- **Private synced photos:** camera/gallery uploads, reusable framing, shared access checks and old-file cleanup.
- **Profile progression:** increasing level requirements and safeguards against farming XP.
- **Device reliability:** configurable reading intervals and pump timings, overdue-reading indicators and alerts.
- **Secure sessions:** authentication tokens use platform secure storage rather than plaintext AsyncStorage.
- **Consistent presentation:** shared modal layouts, loading states, entry animations and a cleaner borderless tile design.

**Latest additions:** an **Activity** tile beneath the main Plant details tile shows the five latest completions with actor and timestamp. A **Search plants** modal, second in the Plants FAB menu, finds nicknames, common or Latin species names, and locations while preserving your filters and sorting. Activity requires the matching backend deployment; search uses the plant data already loaded in the app.

## Project structure

| Directory | Purpose |
| --- | --- |
| [`mobile/`](mobile/) | React Native and TypeScript app, native Android/iOS projects and typed API services |
| [`backend/`](backend/) | Django REST API, authentication, care tasks, sharing, notifications, device integration and recognition |
| [`web/`](web/) | React/Vite website, multilingual documentation, wiring diagrams and legal pages |
| [`deployment/`](deployment/) | VPS deployment scripts, runtime configuration and private photo storage guidance |
| [`ml/`](ml/) | Plant-recognition training tools and supporting work |
| [`translations/`](translations/) | Translation tooling and supporting data |

The backend uses **Django REST Framework, JWT, PostgreSQL, Celery and Redis**. Plant recognition uses **PyTorch/torchvision**, with CPU-only packages in the Docker image. The mobile UI uses React Navigation, native camera and sensor integrations, private photo loading and platform secure token storage.

Android is the primary tested platform. The iOS project and platform-specific handling are included; an iOS release still needs validation with Xcode and real devices.

## Run locally

### Mobile

Use a Node.js version compatible with both projects, such as **22.12 or later**, plus npm and the native Android or iOS toolchain. Start from the repository root:

```sh
cd mobile
npm ci
npm start
```

In another terminal, from the repository root:

```sh
cd mobile
npm run android
```

For iOS, use macOS with Xcode and install the CocoaPods dependencies before building:

```sh
cd mobile
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

Configure `API_BASE` and `PUBLIC_BASE_URL` for your environment before building. The checked-in Android dotenv mapping currently uses `.env.production` for both debug and release; select your intended environment explicitly when developing against a local backend.

### Website and documentation

```sh
cd web
npm ci
npm run dev
```

### Backend

The root [`docker-compose.yml`](docker-compose.yml) defines the development stack: Django, a Celery worker, Celery Beat, Redis, PostgreSQL 16 and MailHog.

Before starting, configure `backend/.env` for development, database and email settings. The Compose file also expects the Firebase service-account file at `backend/secrets/firebase.json`. Plant recognition requires the matching model weights and class mapping under `backend/plant_recognition/artifacts/` for the configured `PLANT_MODEL`.

From the repository root:

```sh
docker compose up --build
```

The development API is available at `http://localhost:8000`, and MailHog's email viewer at `http://localhost:8025`. The web service applies migrations at startup. The Docker image uses Python 3.12.

Production uses a separate VPS Compose configuration. See the [deployment guide](deployment/README.md) for environment variables, trusted proxy settings, migrations, firmware compatibility and backup requirements.

## Delivery and maintenance

- **Backend:** relevant pushes to `main` build a commit-tagged image and deploy it to the VPS. The rollout applies migrations before starting the updated application services.
- **Website:** relevant pushes publish the documentation site through GitHub Pages.
- **Android testing builds:** the Google Play internal-test workflow is **manually triggered in GitHub Actions**, so routine commits do not create mobile releases.
- **VPS storage:** CPU-only recognition dependencies and bounded backend-image retention reduce image accumulation while preserving the previous image for rollback.
- **Private media:** uploaded photos use persistent private storage; backups must include the database and private media together.

See the checked-in [workflows](.github/workflows/) for exact triggers and the [deployment documentation](deployment/README.md) for operational limits. An image rollback does not automatically reverse database migrations.

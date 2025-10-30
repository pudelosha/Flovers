# Flovers — Plant care, reminders & IoT readings

Flovers is a **React Native** app (TypeScript) backed by a **Django** API that helps you manage your plants, schedule care routines, and monitor **real sensor readings** (temperature, humidity, light, soil moisture) from linked devices. Users can create “Plant Instances”, attach reminders, and connect IoT devices to see current and historical data — all secured with **JWT authentication**.

---

## ✨ What it does

### 🌱 Plants (Plant Instances)
- Add your own plants with rich details:
  - Location (indoor/outdoor/other)
  - Light level, orientation, distance from window
  - Pot material, soil mix, purchase date, photo, notes
- Access plants via **QR code** (scan-to-open)
- Edit or delete any plant at any time

### ⏰ Reminders
- Schedule care tasks for:
  - Watering
  - Moisture checks
  - Fertilising
  - General care
  - Repotting
- Repeating intervals (days or months)
- Track task progress and mark as **pending / completed / skipped**

### 🌡️ Readings (IoT Devices)
- Link a device to a specific plant
- Configure a **sampling interval (1–24 hours)**
- Toggle sensors for **temperature, humidity, light,** and **soil moisture**
- Enable **moisture alerts** with a threshold slider (0–100%)
- View the latest snapshot per tile or open detailed history
- Enable/disable device ingestion and rotate account secrets for security

### 🔐 Authentication
- Full **JWT** register/login system
- All plant, reminder, and reading data are private per user session

---

## 🧱 Tech Stack

- **Mobile:** React Native (TypeScript)
- **Backend:** Django + Django REST Framework
- **Auth:** JWT (JSON Web Token)
- **UI/UX:** Glass/blur overlays, animated lists, modern modals & sliders
- **State/data:** Typed service layer with API mappers for UI isolation

---

## 🔐 Authentication

The app uses **JWT** authentication. Tokens are attached automatically to API requests, and all resources are isolated per logged-in user.

---

## 🚀 Getting Started

### Prerequisites

- Node 18+
- Yarn or npm
- React Native environment set up (Android Studio and/or Xcode)
- Python 3.11+ with Django & DRF
- A running Django backend with the necessary REST endpoints

### Setup (mobile)

```bash
# Install dependencies
yarn
# or
npm install

# iOS setup
cd ios && pod install && cd ..
yarn ios

# Android setup
yarn android

# Start Metro bundler
yarn start
```

---

## 🧩 Docker & Local Development

Flovers includes a complete **Docker Compose setup** for the backend stack.

### Services

| Service | Description |
|----------|-------------|
| **web** | Django backend (auto-runs migrations + dev server on port `8000`) |
| **worker** | Celery worker for background tasks (e.g. scheduled jobs, notifications) |
| **beat** | Celery Beat scheduler for periodic tasks |
| **redis** | Message broker used by Celery |
| **db** | PostgreSQL 16 database |
| **mailhog** | Local SMTP testing server with web UI at [http://localhost:8025](http://localhost:8025) |

### Example `docker-compose.yml`

```yaml
services:
  web:
    build:
      context: ./backend
    command: bash -lc "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"
    env_file: ./backend/.env
    working_dir: /app
    volumes:
      - ./backend:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
      - mailhog

  worker:
    build:
      context: ./backend
    command: celery -A app worker -l info
    env_file: ./backend/.env
    working_dir: /app
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - db

  beat:
    build:
      context: ./backend
    command: celery -A app beat -l info
    env_file: ./backend/.env
    working_dir: /app
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-appdb}
      POSTGRES_USER: ${POSTGRES_USER:-appuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-apppass}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  mailhog:
    image: mailhog/mailhog:latest
    # SMTP is at 1025 inside the network; HTTP UI is exposed on 8025
    ports:
      - "8025:8025"

volumes:
  pgdata:
  static_volume:
  media_volume:
```

### Run everything

```bash
# Build and start all services
docker compose up --build
```

Once running:
- Backend available at: **http://localhost:8000**
- MailHog UI: **http://localhost:8025**
- PostgreSQL: **localhost:5432**

### Environment variables

Backend environment variables are stored in `backend/.env`.  
Example:
```env
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
```

---

## 🗺️ Roadmap

- 🤖 **ML-based plant recognition:** detect plant species using the mobile camera and backend ML model.
- 🧠 **Smart reminder planning:** schedule reminders based on plant preferences and light exposure (shade/full sun).
- 📊 **Charts & insights:** visualize reading history and detect anomalies.
- 🔔 **Push notifications:** notify users about reminders and low moisture alerts.
- 🌍 **Offline-first support:** caching and optimistic updates for poor connectivity.

---

## 📸 Photos
<p align="center">
  <img src="https://github.com/user-attachments/assets/4b37dfa0-e3fd-4be2-a6fe-0928606ac974" width="19%" alt="Plants">
  <img src="https://github.com/user-attachments/assets/cb5d8dd4-b3c2-46b0-a205-e727cb7e2b90" width="19%" alt="Create Plant">
  <img src="https://github.com/user-attachments/assets/500a98ce-c073-42ec-8b47-a2f5d30ff687" width="19%" alt="Reminders">
  <img src="https://github.com/user-attachments/assets/1f0629d8-4f66-49c8-9742-ea8a0fc37a31" width="19%" alt="Profile">
  <img src="https://github.com/user-attachments/assets/4139ed8d-c45e-4c95-8c5f-6f477e233136" width="19%" alt="Modal">
</p>


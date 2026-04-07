# 📚 TOEFL Prep — Personal English Learning Platform

A professional full-stack English learning platform with spaced repetition, AI writing feedback, listening exercises, level progression, and an admin content panel.

---

## 🚀 Quick Start

### 1. MongoDB Atlas (free)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free M0 cluster
2. Database Access → Add user `toefl_admin` with password
3. Network Access → Allow from Anywhere (0.0.0.0/0)
4. Connect → Drivers → copy the connection string

### 2. Environment files

**backend/.env** (copy from `.env.example`):
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://toefl_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/toefl_prep?retryWrites=true&w=majority
JWT_SECRET=ToeflPrep2026_SuperSecretKey_xyz789abc
JWT_EXPIRES_IN=7d
ADMIN_PASSWORD=ToeflAdmin2026
CORS_ORIGIN=http://localhost:5173
THROTTLE_TTL=60
THROTTLE_LIMIT=120
```

**frontend/.env** (copy from `.env.example`):
```
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_NAME=TOEFL Prep
```

### 3. Install & run

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

### 4. Make yourself admin

After registering, run in MongoDB Atlas → Browse Collections → users:
```json
{ "updateOne": { "filter": { "email": "your@email.com" }, "update": { "$set": { "role": "admin" } } } }
```
Or use Atlas UI: find your user document → click Edit → change `role` to `"admin"`.

Then **log out and log back in**.

---

## 📦 Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + MongoDB Atlas + Mongoose |
| Auth | Passport JWT + bcrypt |
| Frontend | React 18 + TypeScript + Vite |
| State | Zustand |
| i18n | i18next (EN / RU / HY) |
| Writing AI | LanguageTool API (free, no key) |
| Listening | Web Speech API (browser built-in) |
| Translation | MyMemory API (free, no key) |
| Spaced Rep | SM-2 algorithm |

---

## 🎮 Features

- **10 levels**: A1 → A1+ → A2 → A2+ → B1 → B1+ → B2 → B2+ → C1 → C2
- **6 exercise types**: Grammar (fill-in-blank), Quiz (4-option), Vocabulary (SM-2 flashcards), Reading (with word translation), Listening (dictation + comprehension), Writing (AI feedback)
- **Level tests**: 50 questions, 45-minute timer, 85% pass threshold, 24h cooldown on fail
- **XP + streak system** with multipliers (×1.2 / ×1.5 / ×2.0)
- **Mistake tracker** with weak-area heatmap
- **Admin panel**: JSON import for all content types, user stats
- **Dark/light theme** + EN/RU/HY localization
- **Cloud sync**: Progress stored in MongoDB Atlas

---

## 📝 Admin: Adding Content

Go to `/admin` → pick content type → paste JSON → click Import.

Example exercise:
```json
{
  "exercises": [{
    "topic": "Present Simple",
    "level": "A1",
    "difficulty": "easy",
    "sentence": "She _____ to school every day.",
    "blanks": [{ "position": 0, "answer": "goes", "hint": "3rd person" }],
    "explanation": "Use -s/-es with he/she/it.",
    "tags": ["a1", "present-simple"]
  }]
}
```

See AdminPage for full JSON examples for each content type.

---

## 📁 Project Structure

```
toefl-prep/
├── backend/          NestJS API
│   ├── src/
│   │   ├── modules/  15 feature modules
│   │   ├── common/   Guards, filters
│   │   └── config/   Environment config
│   └── .env.example
└── frontend/         React + TypeScript
    ├── src/
    │   ├── pages/    14 pages
    │   ├── components/
    │   ├── services/ API calls
    │   ├── store/    Zustand stores
    │   ├── i18n/     EN/RU/HY
    │   └── styles/   Global CSS design system
    └── .env.example
```

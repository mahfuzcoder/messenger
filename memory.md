# 🧠 Memory — Messenger Project Log

> এই ফাইলটি প্রকল্পের **সম্পূর্ণ ইতিহাস**: কখন কী বদলেছে, কেন বদলেছে, এখন কী অবস্থায় আছে।
> প্রতিবার code পরিবর্তনের পর এটি update করতে হবে। (Rule: airule.md §1.6)

---

## 📌 Project Snapshot

| বিষয় | তথ্য |
|-------|------|
| Project | Messenger — Real-time Messaging Website |
| Stack | Node.js + Express + Socket.IO + MongoDB + Cloudinary |
| Frontend | React + Vite, CSS |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Database | MongoDB (Mongoose ODM) |
| Hosting target | Render (backend) + MongoDB Atlas (DB) |
| Folder structure | `backend/` (API + Socket.IO) আর `frontend/` (HTML/CSS/JS) — আলাদা আলাদা ফোল্ডার |
| Current version | v1.6.0 |
| Last updated | 2026-10-30 |

---

## 📅 Change Log

| Date | Version | Change | Files | Status |
|------|---------|--------|-------|--------|
| 2026-10-30 | v1.6.0 | **Render + MongoDB Atlas production hardening** — (1) `server.js`: custom Helmet CSP (allows `blob:` previews, CDN media, `ws:/wss:` + allowed origins in connect-src; `upgrade-insecure-requests` only in production), per-request CORS wrapper, CSRF origin gate (foreign Origin → 403), global `/api` limiter (600/15min), `GET /health` endpoint, `mongoose.connect` fails fast (10s timeout + readable error + `exit(1)`), production Cloudinary-missing warning, SIGTERM/SIGINT graceful shutdown, Socket.IO `allowRequest` origin enforcement. (2) `middleware/auth.js`: own-origin (host + `x-forwarded-proto`) always allowed → single Render instance serves UI + API. (3) `routes/conversations.js`: factory `conversationRoutes(io, upload)` + group-photo endpoint `POST /api/conversations/:id/avatar` (member-only, image-only, temp file unlinked on every rejection path). (4) `utils/upload.js`: `configureCloudinary`/`removeStoredFile`/`cloudinaryFile` helpers; `routes/users.js` deletes old avatar on replace. (5) `middleware/error.js`: `CastError`→400, bad JSON→400, oversized body→413 (no more 500s). (6) `routes/auth.js`: auth limiter 10→30/15min (shared-NAT lockout fix, brute-force still verified 35→429). (7) `render.yaml` (`npm install && npm run build`, `/health`, env docs), `.env.example`, guide.md A3/A5, `App.jsx` avatar live-patch. **Test results:** 56 REST + 14 Socket.IO + 12 production-mode checks — all passing (mongodb-memory-server) | `backend/server.js`, `backend/middleware/auth.js`, `backend/middleware/error.js`, `backend/routes/auth.js`, `backend/routes/users.js`, `backend/routes/conversations.js`, `backend/utils/upload.js`, `frontend/src/App.jsx`, `render.yaml`, `.env.example`, `guide.md` | ✅ Done |
| 2026-10-29 | v1.5.0 | Migrated the messenger interface to React components and Vite; Node/Express now serves the production build, with separate React development and Node server commands | `frontend/src/*`, `frontend/vite.config.js`, `backend/server.js`, `package.json` | ✅ Implementation in place; dependency install/build verification pending |
| 2026-10-29 | v1.4.0 | Rebuilt missing frontend as responsive Nook Messenger prototype based on saved Stitch design; added interactive inbox/search/filter/new-chat/message composer and Express static server entry point | `frontend/index.html`, `frontend/css/style.css`, `frontend/js/app.js`, `backend/server.js` | ✅ UI prototype complete; backend accounts, persistence and real-time messaging not connected |
| 2026-10-18 | v1.0 | Project initialization — documentation created (requirement, airule, guide, memory) | `requirement.md`, `airule.md`, `guide.md`, `memory.md` | ✅ Done |
| 2026-10-18 | v1.0 | Backend scaffold — Express app, MongoDB config, security middleware (helmet, CORS, origin check, rate limit) | `backend/*` | ✅ Done |
| 2026-10-18 | v1.0 | Auth system — Signup/Login/Logout/Me, bcrypt password hashing, JWT httpOnly cookie | `backend/controllers/authController.js`, `backend/routes/authRoutes.js` | ✅ Done |
| 2026-10-18 | v1.0 | User system — search user, update profile, avatar upload via Cloudinary | `backend/controllers/userController.js` | ✅ Done |
| 2026-10-18 | v1.0 | Conversation + Message system — private/group chat, history pagination, delete, read receipts | `backend/controllers/conversationController.js`, `messageController.js` | ✅ Done |
| 2026-10-18 | v1.0 | Real-time layer — Socket.IO auth, rooms, presence (online/offline), message broadcast, seen status | `backend/sockets/index.js` | ✅ Done |
| 2026-10-18 | v1.0 | Frontend — login/signup page, chat UI (responsive), image/video/voice send, group create, delete | `frontend/*` | ✅ Done |
| 2026-10-18 | v1.0 | Security review + full testing — 35 REST tests + 10 Socket.IO tests, all passing | — | ✅ Done |
| 2026-10-18 | v1.0 | **Restructure** — `server/` → `backend/`, `public/` → `frontend/` (separate top-level folders); paths + docs updated, all tests re-run | `backend/app.js`, `package.json`, `airule.md` | ✅ Done |
| 2026-10-19 | v1.1 | **Media/voice upload fix** — local `uploads/` fallback when Cloudinary keys are missing (was: hard 503); storage abstraction `storeMedia()`; `/uploads` served safely; avatar must be an image (415); voice mic error now explains the HTTPS requirement | `backend/utils/storage.js` (new), `uploadController.js`, `userController.js`, `app.js`, `server.js`, `frontend/js/messages.js` | ✅ Done |
| 2026-10-19 | v1.1.1 | **"Site not loading properly" fix** — verified with a real headless-browser E2E (signup → search → open chat → send → mobile viewport). Bug found: new private chat showed **"Unknown user"** in the header (conversation created without populated members) → fixed; favicon was missing (404) → added `favicon.svg`. All suites re-run green | `backend/controllers/conversationController.js`, `frontend/favicon.svg` (new), `frontend/index.html`, `frontend/chat.html` | ✅ Done |
| 2026-10-19 | v1.1.2 | **Registration "Too many requests" fix** — `GET /api/auth/me` (called on every page load) shared the strict 30 req/15min auth limit with signup/login, so normal browsing exhausted the quota and new users got blocked on the registration form. Strict limiter now counts only `POST /api/auth` routes (`skip` non-POST); brute-force protection verified still active (35 wrong logins → 429). Browser-tested all 4 form paths: empty, invalid, duplicate, valid | `backend/app.js` | ✅ Done |
| 2026-10-27 | v1.2.0 | **Profile photo crop feature** — "Change photo" now opens a crop dialog (1:1 circular frame, drag to reposition, zoom slider/wheel/pinch up to 4×, Cancel/Reset/Save) before uploading; saves a 512×512 JPEG through the existing avatar endpoint. Cropping is done fully in the browser (vendored Cropper.js v1.0.0-rc in `frontend/vendor/`, no build step) — server unchanged. Two fixes along the way: (1) **CSP** `connect-src` now allows `blob:` (Chrome blocks object-URL previews through connect-src, so the picked image was invisible); (2) Cropper.js v1 dispatches `zoom` events on the image element — no `.on()` method exists, listener is bound with `addEventListener` + removed on cleanup. Verified by headless-Chromium E2E: 17/17 checks (crop opens, drag moves crop, 4× zoom, save→avatar updated, old `uploads/` file deleted on replace, 390px mobile fits, Cancel/✕ release cropper + object URL) + 8/8 curl smoke | `frontend/js/crop.js` (new), `frontend/chat.html`, `frontend/css/style.css`, `frontend/js/chat.js`, `backend/app.js`, `frontend/vendor/cropper.min.js` + `cropper.min.css` (new) | ✅ Done |
| 2026-10-27 | v1.3.0 | **Group photo feature** — group chats get a 📷 badge on the header avatar (groups only); pick → same crop dialog (reused via new `Crop.open(file, onSave)` callback) → `POST /api/conversations/:id/avatar` → photo shown in header + sidebar, live for every member via `conversation:updated` (no reload). Any member may change it (product decision). New photo replaces the old: previous file deleted from storage (`avatarPublicId` added to Conversation model). **Bug fixed (pre-existing, v1.0):** `notifyMembers` built socket room names from populated member **documents** (`user:{ name: … }` never matched a room), so sidebar-update emits to `user:` rooms had never reached anyone — rooms now use `member._id \|\| member`; this also fixes live list updates on private/group creation. Verified: group E2E 13/13 (2 users — live header+sidebar update on the other member without reload, badge hidden in private chats, mobile 390px), profile-crop regression 17/17, curl API suite 8/8 + group-photo suite 13/13 (member ✅, outsider 403, private 403, non-image 415, replace deletes old file) | `backend/models/Conversation.js`, `backend/controllers/conversationController.js`, `backend/routes/conversationRoutes.js`, `frontend/js/crop.js`, `frontend/js/chat.js`, `frontend/chat.html`, `frontend/css/style.css` | ✅ Done |
| 2026-10-18 | v1.0 | Security review + testing (unit of API via curl, local MongoDB) | — | ✅ Done |

---

## 🏗️ Architecture Decisions (গুরুত্বপূর্ণ সিদ্ধান্ত)

### D1. Message send কোথায় হবে? → REST API, broadcast Socket.IO
- **Decision:** মেসেজ save হয় `POST /api/conversations/:id/messages`-এ; সার্ভার save করার পর Socket.IO দিয়ে room-এ broadcast করে।
- **কেন:** DB logic এক জায়গায় (controller), socket handler-এ duplicate নয়। ক্লায়েন্ট `_id` দিয়ে dedupe করে।

### D2. Token কোথায় রাখা হবে? → httpOnly cookie (localStorage নয়)
- **কেন:** XSS থেকে token চুরি রোধ। CSRF রোধে সঙ্গে origin-check middleware।

### D3. Frontend — React + Vite
- **কেন:** UI is organized as reusable components and Vite provides a straightforward local development server and production build.

### D4. File storage → Cloudinary (local disk নয়)
- **কেন:** Render-এর ephemeral disk-এ file থাকে না; CDN হিসেবেও দ্রুত।

### D5. Presence tracking → in-memory Map
- **কেন:** v1-এ single-process deploy (Render free) — Redis adapter ছাড়াই যথেষ্ট। Multi-instance হলে Socket.IO Redis adapter যোগ করতে হবে।

---

## 🐛 Known Issues / TODO

- [ ] Render free tier-এ local `uploads/` file restart-এ মুছে যায় → production-এ Cloudinary key দিন (local fallback শুধুমাত্র development-এর জন্য সুবিধা)
- [ ] Render free tier — server sleeps after idle; first request may take ~30s (cold start)
- [ ] Future: message edit, forward, emoji reaction, push notification, voice/video call

---

## 🔑 Important Facts (মনে রাখার মতো)

1. Port: `3000` (env `PORT`), MongoDB: `mongodb://127.0.0.1:27017/messenger` (local dev)
2. Message history: **50 messages per page**, sorted newest-first, `?before=<ISO date>` cursor
3. Socket events use `domain:action` naming: `message:new`, `message:read`, `presence:update`
4. Rooms: `user:<userId>` for presence, `conversation:<conversationId>` for chat
5. Upload limits: image/video/audio only, **25MB** max. Cloudinary configured → CDN; otherwise saved to local `uploads/` (served at `/uploads/...`). Avatar must be an image (video/audio rejected with 415).
6. Voice recording needs **HTTPS or localhost** — browsers block the microphone on plain HTTP (e.g. phone via `http://192.168.x.x`); the UI explains this.
7. Password: bcrypt cost **12**, `select: false` on User.password
8. Test accounts can be created via `POST /api/auth/signup`

---

## 📈 Roadmap

| Phase | Items | Status |
|-------|-------|--------|
| v1.0 | Core chat: auth, private/group, real-time, media, voice, presence, seen, delete, search, responsive | ✅ Complete |
| v1.2.0 | Profile photo crop dialog (Cropper.js) + CSP `blob:` fix | ✅ Complete |
| v1.3.0 | Group photo (crop dialog, live update) + `notifyMembers` room bug fix | ✅ Complete |
| v1.6.0 | Render + MongoDB Atlas production hardening (CSP/CORS/CSRF/rate limit/fail-fast DB/graceful shutdown) + group-photo API | ✅ Complete |
| Next | Emoji picker, message reply, typing indicator | ⬜ Planned |
| Later | Message edit, forward, unread badge per conversation | ⬜ Planned |
| v2.0 | Voice/video call (WebRTC), push notification, multi-instance (Redis) | ⬜ Ideas |

# SceneCraft Platform

SceneCraft started as a single-user story-analysis tool. We are turning it into a Wattpad-style reading and publishing platform. Full brief: `docs/Platform_Spec.pdf` (cite sections by number). Four roles: reader, writer, publisher, admin. Follow `docs/Platform_Spec.pdf` as authoritative.

## Stack
- Backend: Node >=18, Express 4, ESM, Mongoose 8, Redis (ioredis), BullMQ, Socket.io, Joi, multer 2, winston, express-rate-limit with RedisStore. Tests: `node --test` (see `backend/tests/helper.js`).
- Frontend: React 19, Vite, Tailwind v4, framer-motion, @xyflow/react, recharts, lucide-react, socket.io-client. Lint: oxlint.
- AI: OpenRouter via `backend/src/services/ai-provider.service.js` (`generateJSON`).

## Backend conventions (follow them; do not invent new layers)
- Layering: `routes -> controllers -> services -> repositories -> models` (controllers handle request parsing and call services; one router per controller). DTOs in `dtos/`, Joi schemas in `validators/`, errors from `utilities/custom-errors.js`, responses via `utilities/response.js` (`sendSuccess`, `sendCreated`, `sendPaginated`; envelope `{ success, message, data }`).
- Folders are `middleware/` and `utilities/` (singular/this spelling). Constants live in `constants/`.
- `constants/roles.js` is for CHARACTER and RELATIONSHIP roles. User roles go in `constants/user-roles.js`.
- Analysis models (Scenes, Characters, Relationships, etc.) keep pointing at the Document and gain a `bookId` reference per spec section 9. Document also adds `bookId`. A Book points to its Document (`Book.documentId`).
- Scene offsets (`Scene.textRange.start/end`) are JS string indices (UTF-16 code units) into `Document.parsedText`. Page offsets use the same unit. Binary search on `Book.pageOffsets` maps character offsets to page numbers.
- Every route file declares its allowed roles at the top of each route via `authorize(...)` or is listed in `PUBLIC_ROUTES`. A test enforces this (added in Phase 10).
- The server is the real gate. Frontend `RoleRoute` is UX only.
- Manuscripts stay private: store the original file in MongoDB GridFS (`Document.fileId`). Only covers and avatars go to Cloudinary through `storage.service.js` (`saveImage`, `deleteImage`, `imageUrl`). Mongo stores `publicId` and `url` only.
- Do not touch pipeline stage logic in `workers/pipeline.worker.js` unless the phase says so.

## Contracts shared across phases
- Book status: `draft`, `processing`, `published`, `unpublished`, `removed` (admin takedown). Book stays Draft until parsing and pagination finish, then can be set Published once the rights checkbox is accepted.
- User status: `active | pending | banned` (3 strikes policy leads to suspension/ban). Publishers start `pending` until admin approval. Banned users: 403 on write routes, cannot log in again, books hidden not deleted.
- Reading progress stores `currentPage` and `furthestPage` on `ReadingList` alongside `bookmarks[]` (spec section 9).
- Spoiler filter: characters, graph edges, scenes and timeline events are filtered to those falling on or before `furthestPage` by binary-searching `Book.pageOffsets` with stored offsets. All reader analysis goes through `services/spoiler.service.js` with `?upto=page`.
- Feature access lives in one constant, `constants/feature-access.js` (spec section 2 matrix). No route hard-codes its own rules.
- Env access only through `config/env.js` (Joi-validated).

## Design (spec section 12)
Wattpad-inspired structure and orange palette, original assets. NEVER use the Wattpad name, logo, illustrations, icons, covers, headline wording; never hotlink their images.
Tokens: `--primary #FF500A`, `--primary-hover #E04600`, `--primary-tint #FFF0E8`, `--ink #121212`, `--muted #6B6B6B`, `--border #E5E5E5`, `--surface #F7F7F7`, `--success #1F9D55`, `--danger #D63B2F`. UI font Nunito Sans, reading font Lora. Pill buttons, covers always 2:3, max width 1200, body contrast >= 4.5:1, respect `prefers-reduced-motion`.
Brand is a placeholder: use the `APP_NAME` constant and a `Logo` component. Never hard-code the name.

## Working rules
- Plan first. Keep changes scoped to the current phase. Say so when something belongs to a later phase instead of building it.
- Before declaring done: run backend tests, `npm run lint` and `npm run build` in `frontend/`, and fix failures you caused.
- Add tests for new backend logic (permissions, state machines, edge cases), not just happy paths.
- Never commit secrets. Never commit or push unless asked.
- Final message: files changed, commands run with results, deviations, TODOs left, decisions needed from me.

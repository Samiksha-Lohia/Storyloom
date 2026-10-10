# Decisions Log

Append one entry per phase: decision, reason, date.

## Phase 0 - Project Setup & Architecture Alignment
- **Decision**: Treat `docs/Platform_Spec.pdf` as the authoritative source of truth across all architectural decisions. Specifically:
  1. Add `bookId` references to analysis models and `Document` (spec §9).
  2. Store original manuscript files in MongoDB GridFS (`Document.fileId`) with parsed text and page offsets in Mongo (spec §4, §8, §9).
  3. Manage Cloudinary operations (covers, avatars) behind `storage.service.js` with `saveImage`, `deleteImage`, `imageUrl` (spec §8).
  4. Track reader progress as `currentPage` and `furthestPage` on `ReadingList` (spec §4, §5, §9, §10).
  5. Structure backend with `controllers/` layer paired with route files declaring roles (spec §11).
  6. Enforce User status as `active | pending | banned` with strike progression (spec §2, §13).
  7. Enforce Book status as `draft`, `processing`, `published`, `unpublished`, `removed` (spec §3, §9).
- **Reason**: User confirmed to follow `docs/Platform_Spec.pdf` in everything.
- **Date**: 2026-10-03

## Phase 1 - Backend Foundation (Roles, RBAC, Models, Cloudinary, Publish & Catalogue)
- **Decision**:
  1. Extended `User` model with roles (`reader`, `writer`, `publisher`, `admin`), statuses (`active`, `pending`, `suspended`, `banned`), unique slugified `username`, `publisherProfile`, `strikes`, `defaultTemplate`, and Cloudinary avatar fields.
  2. Implemented RBAC middleware (`authorize`, `requireActive`, `requireApprovedPublisher`) and updated JWT payload and Socket.io authentication to propagate `role` and `status`.
  3. Added `image.service.js` for Cloudinary cover/avatar uploads, deletions, and preset-based URL transformations (`cover`, `thumb`, `avatar`).
  4. Created `Book` model with catalogue indexes (status+genre, status+createdAt, writerId, text search), 6 accessible hex accent presets, and bidirectional relationship with `Document` (`Document.bookId`).
  5. Implemented multipart `uploadBook` middleware and `createBook` service with full rollback cleanup on partial failures.
  6. Implemented public catalogue API (`GET /books`) excluding mature books by default, with status, genre, tag, rating, and length filtering.
  7. Created idempotent `seed-admin.js` script requiring passwords >= 12 chars, and `migrate-existing-users.js` script.
- **Reason**: Implement Phase 1 foundation per Platform Spec sections 2, 8, 9, 10, and 13.
## Phase 2 - Frontend Foundation (Design System, Tokens, Auth, Layouts, Catalogue & Classic Book Page)
- **Decision**:
  1. Installed `react-router-dom` to replace the single-view `App.jsx` state machine with a declarative, role-aware routing architecture.
  2. Implemented the design system tokens in `index.css` via Tailwind v4 `@theme` with brand colors (`--primary: #FF500A` with TODO comment, `--ink: #121212`, `--surface`, `--border`, etc.), Google Fonts (Nunito Sans for UI, Lora for literary reading), focus rings, and reduced motion overrides.
  3. Created reusable design system components in `components/common/`: `Logo`, `Button`, `Chip`, `Input`, `BookCard`, `CoverImage` (with Cloudinary preset helper + generated 2:3 tinted fallback block), `Carousel` (desktop arrows, touch swipe, keyboard nav), `StarRating`, `RoleRoute`, `EmptyState`, and `Skeleton`.
  4. Constructed `PublicLayout` with sticky top bar (Logo, Browse with genre dropdown, Write, For publishers, search box, user menu / login-signup buttons) and spec footer. Created `SidebarLayout` shell for writer, publisher, and admin portals.
  5. Implemented `AuthContext` + `useAuth` hook hydrating from `scenecraft_*` localStorage keys and `GET /auth/me`, with 401 automatic session cleanup.
  6. Built split-layout `LoginPage` and `SignupPage` with role selector (Reader, Writer, Publisher), dynamic publisher verification fields, password strength indicator, and visible disabled Google sign-in reservation. Added `/p/apply-status` waiting screen for pending publisher accounts.
  7. Built `LandingPage` with dual modes: Guest landing per spec §12.4 (hero with floating badges, trending carousel, original CSS/SVG genre tiles, "Read deeper" narrative intelligence preview, and three role cards) and a personalized Home feed for logged-in users.
  8. Created Catalogue page (`/browse`, `/browse/:genre`, `/search`) with responsive 6-col desktop / 4-col tablet / 3-col mobile grid, genre pills, sorting, and pagination.
  9. Implemented Classic Book detail page (`/book/:id`) structured as a data component (`BookPageData`) and presentation wrapper (`ClassicTemplate`), featuring cover, stats row, reading time, tags, expandable synopsis, Summary/Insights/Reviews tabs, 18+ mature notice, and guest sign-up prompt.
  10. Added static legal pages (`/terms`, `/privacy`, `/copyright`) with visible "Draft: requires legal review" warning banners.
  11. Preserved legacy analysis workspace at `/dev/workspace/:documentId` guarded by `RoleRoute` (writer, admin).
  12. Created idempotent backend seeding script (`seed-demo-books.js`) seeding 12 published books across multiple genres with original titles, blurbs, and stats.
- **Reason**: Implement Phase 2 frontend foundation per Platform Spec sections 5, 11, and 12, following the Wattpad-inspired design system guidelines and constraints.
- **Date**: 2026-10-03
## Phase 3 - Reading Foundation (Server-side Pagination, Windowed Pages, Progress & Reader Settings)
- **Decision**:
  1. Implemented `paginator.service.js` as pure functions without I/O. Offsets represent JavaScript UTF-16 string index boundaries, breaking text with greedy target character chunks (~1800 chars) hierarchically: paragraph ends (`\r?\n\r?\n`) -> sentence boundaries (`[.!?]\s+`) -> whitespace, never mid-word. Strict property invariants verified: offsets strictly increasing, `pages.join('') === text`.
  2. Integrated hook at the end of `runParsing` in `pipeline.worker.js`: if a Book exists for the document, computes `pageOffsets` and `pageCount`, transitions Book status `processing -> draft`, and emits `pipeline:paginated` via `emitDocumentEvent`. Tightened publication gating in `book.service.js` to require `pageCount > 0`.
  3. Created `scripts/repaginate.js` with Redis cache invalidation, batch-repaginating books lacking offsets and supporting `--force`/`--all`. Updated `seed-demo-books.js` to seed books ready for repagination.
  4. Implemented `GET /books/:bookId/pages?from=&to=` with 5-page window cap, JS string offset slicing, and 1-hour Redis caching (`book:${bookId}:pages:text`) invalidated on repaginate or book deletion. Avoided MongoDB `$substrCP` to ensure UTF-16 code unit consistency.
  5. Implemented mature content gate with `PUT /me/mature-ack`. Unacknowledged non-owner/non-admin requests for mature book pages or analysis return 403 with `MATURE_ACK_REQUIRED`.
  6. Implemented `GET /books/:bookId/scene-markers` resolving `Scene.textRange.start` via binary search over `pageOffsets`, returning scene boundary numbers for navigation.
  7. Created `ReadingList` model per spec §9 with compound unique `readerId + bookId`, monotonic `furthestOffset = Math.max(old, new)`, auto-creation on first page fetch, auto-completion (`finished`) when reaching the last page, bookmark management, and per-user rate limiting.
  8. Hooked first reader progress entry creation to atomically increment `book.stats.reads`.
  9. Added reader settings (`fontSize`, `lineHeight`, `fontFamily`, `theme`) with Joi validation on `PATCH /me/settings`, embedded in `UserDto` and `GET /auth/me`.
## Phase 3B - Writer Publish Flow & Reader Experience (UI, Gestures, Scrubber, Settings, Canvas Cropper)
- **Decision**:
  1. Built custom `CoverCropper.jsx` with an interactive HTML5 canvas instead of `react-easy-crop` to avoid React 19 peer-dependency conflicts and bundle overhead, providing 2:3 fixed aspect ratio, pan/zoom controls, and high-res JPEG Blob generation.
  2. Implemented `usePipelineProgress.js` hook extracting WebSocket (`io`) room subscriptions (`pipeline:stage-started`, `pipeline:stage-completed`, `pipeline:paginated`, `pipeline:document-ready`) paired with 3-second HTTP polling fallback (`/jobs`), preserving `Loader.jsx` compatibility.
  3. Created `NewBookPage.jsx` (/w/books/new) multi-step wizard: manuscript drag-and-drop with client-side 15 MB / file type validation, 2:3 cover cropper, metadata, Classic template, rights checkbox, and AI disclosure per spec §13.
  4. Created `MyBooksPage.jsx` (/w/books) with status chips (`processing`, `draft`, `published`, `unpublished`), progress tracking, Publish/Unpublish buttons (publish disabled with explanation until pagination is complete), reader preview, and deletion modal. Added `GET /api/books/writer/mine` backend route for writer book management.
  5. Implemented `ReaderPage.jsx` (/read/:bookId) with windowed prefetching (current page + next 2 + previous 1; max 5 pages), keyboard navigation (Left/Right/Space), edge clicking (12% margins), touch swipe gestures, and Framer Motion slide transitions honoring `prefers-reduced-motion`.
  6. Implemented reading progress auto-resume at `currentOffset` on open, with 1-second debounced progress saves sent to `PUT /me/library/:bookId` keeping `furthestOffset` strictly monotonic.
  7. Built `Scrubber.jsx` with draggable range slider, "Page X of Y", percentage read, jump-to-page input, and scene marker ticks from `/scene-markers`.
  8. Created `ReaderSettingsPopover.jsx` supporting font size (14-28px), line height (1.4-2.1), font family (Lora serif vs Nunito sans), and themes (`light`, `sepia`, `dark`) with contrast ratios >= 4.5:1, saved via `PATCH /me/settings` and applied instantly.
  9. Added `BookmarksDrawer.jsx` with toolbar "Mark" button, relative timestamps, and jump-to-page navigation.
  10. Added wide-screen (>= 1024px) optional two-page spread toggle.
  11. Added `MatureGateModal.jsx` blocking unacknowledged readers on 18+ stories until confirmed via `PUT /me/mature-ack`.
  12. Built `FinishCard.jsx` on the last page with completion celebration, Phase 5 rating/review preview, and replay button.
  13. Wired Start/Continue reading button and round `+` library button on Classic book detail page.
  14. Added Insights top bar button with Phase 4 drawer placeholder.
- **Reason**: Implement writer publish journey and reader experience per Platform Spec sections 3, 4, 8, 11, and 13.
- **Date**: 2026-10-04

## Phase 4 - Role-Gated Narrative Analysis
- **Decision**:
  1. Formalized feature access matrix (`constants/feature-access.js`) covering all 10 features across roles (`writer`, `reader`, `publisher`, `admin`) with modes: `full`, `filtered`, `summary`, `main-cast`, `hidden`.
  2. Implemented centralized access control service (`spoiler.service.js`) with role-based feature gating across scenes, character profiles, relationships, timeline events, story arc, and semantic search.
  3. Unified analysis endpoints under `/books/:bookId/analysis/:feature` with role enforcement and rate limiting.
  4. Built `InsightsDrawer.jsx` offering live reader-facing story intelligence directly inside reader and book pages.
- **Reason**: Spec §2, §4, and §12.6 mandate role-gated analysis access.
- **Date**: 2026-10-04

## Phase 5 - Community, Moderation, Trust & Integration
- **Decision**:
  1. Built `Review` model with compound unique index on `readerId + bookId`, 1-5 rating, text review, status, and `readByWriter` flag. Atomic aggregate pipeline recomputes `Book.stats.ratingAvg` and `ratingCount` on every review write/update/delete.
  2. Mounted review routes under `/books/:bookId/reviews` with role gating (readers only; writers and publishers forbidden from reviewing).
  3. Implemented writer unread review clearing with `PATCH /books/:bookId/reviews/:reviewId/read` restricted to author and admin.
  4. Built `Report` model and admin moderation queue (`GET /admin/reports`, `PATCH /admin/reports/:reportId`) with automated 3-strike progression (3 strikes = automated suspension, hiding all published books) and immutable `AuditLog` records.
  5. Built public copyright takedown notice endpoint (`POST /reports/public-notice`) with honeypot spam protection.
  6. Added `Notification` system with read/unread tracking and real-time counter. Added `POST /books/:bookId/accept-terms` for writer terms re-acceptance.
  7. Integrated frontend components: `AdminReportsPage` routed in admin layout, `NotificationBell` with polling/badge updates, `BookReviews` in book tabs, `ReportButton` modal, and `api.js` method names & aliases synchronized with 100% test coverage (57/57 tests passing).
- **Reason**: Spec §9, §12.6, and §13 require moderation, reviews, notifications, and DMCA/copyright handling.
- **Date**: 2026-10-04

## Phase 6 - Analytics, Nightly Rollup, Drop-off Tracking & Writer Dashboard
- **Decision**:
  1. Implemented `ViewEvent` model with compound unique index `{ type: 1, targetId: 1, viewerKey: 1, day: 1 }` ensuring strict once-per-viewer-per-day deduplication. Viewer keys are user IDs for authenticated sessions, and SHA-256 HMAC hashes of anonymous cookie/header identifiers with daily secret salts for guests. No raw IP addresses are ever persisted.
  2. Guarded view event writes (`book_view`, `profile_view`, and `active` user logging) using Redis `SET NX` keys with 24-hour expiration (`view:book:...`, `view:profile:...`, `user:active:...`), eliminating duplicate database writes across requests on the same day.
  3. Created `DailyStat` model with compound unique index `{ date: 1, scope: 1, targetId: 1 }` storing aggregated daily metrics across `book`, `writer`, and `platform` scopes (`views`, `reads`, `reviews`, `readingListAdds`, `completions`).
  4. Created dedicated BullMQ queue `platform-maintenance` and worker `maintenance.worker.js` with repeatable nightly cron `0 2 * * *` (configurable via `MAINTENANCE_CRON`), registered alongside the pipeline worker in `server.js`.
  5. Implemented `stats-rollup.service.js` with idempotent re-runnable rollups across single dates and arbitrary date ranges, automatically refreshing `Book.stats` (`reads`, `ratingAvg`, `ratingCount`, `completionRate`, `readingListAdds`). Added CLI utility `scripts/backfill-stats.js`.
  6. Implemented `GET /writer/analytics` with range selector (30/90 days), story filtering, 7 KPI cards, reads/views time series, 10-bucket drop-off distribution (`furthestOffset / length * 100`), per-book comparisons, and rating histograms. Drop-off aggregation is backed by compound index `{ bookId: 1, furthestOffset: 1 }` on `ReadingList` with verified index-backed `explain('executionStats')`.
  7. Added direct `PATCH /reviews/:id/read` endpoint and `GET /writer/reviews` endpoint with book, star rating, and unread status filtering.
  8. Built modern frontend Writer Studio experience:
     - `WriterDashboardPage.jsx` (/w/dashboard) with 7 KPI cards, range switchers, story filter, per-story performance table, and lazy-loaded Recharts visualizations (`WriterCharts.jsx`) using brand design tokens (`#FF500A`, `#64748B`, `#1F9D55`, `#E5E5E5`).
     - `WriterReviewsPage.jsx` (/w/reviews) with unread badge counter, star rating filter pills, story selector, inline "Mark as read" interaction, and accessible empty/loading states.
     - Wired real routes in `App.jsx` and verified bundle chunking and 0 build errors.
- **Reason**: Implement trustworthy analytics, drop-off visibility, and writer dashboard per Platform Spec §7, §9, and CLAUDE.md.
- **Date**: 2026-10-04

## Phase 7 - Writer Templates, Accessible Accents & Live Preview
- **Decision**:
  1. Template Architecture: Unified data and tab state under `BookPageData.jsx` component. `ClassicTemplate`, `ShowcaseTemplate`, and `NotebookTemplate` are purely layout and aesthetic presentation wrappers without business logic:
     - Classic: Clean editorial two-column layout with scoped `--accent` styling, rating badges, and action bars.
     - Showcase: Full-width immersive cinematic hero with dynamic backdrop created by blurring and darkening the book cover via CSS filters (`backdrop-blur-2xl bg-black/60 object-cover scale-110 filter blur-xl`), centered elevation-shadowed cover, stat chips, full-width synopsis, and an author profile card on the side.
     - Notebook: Creative journal layout featuring parchment texture with ruled line gradients (`repeating-linear-gradient(...)`), red margin border, rotated "pinned" book cover with drop shadows, tag badges styled as colorful sticker chips, and handwritten typography (`Caveat`) for titles and headings while retaining high-legibility clean body fonts.
  2. Accent System & WCAG 2.1 Contrast Audit:
     - Audited all 6 Phase 1 presets for 4.5:1 text-on-white and white-on-button contrast.
     - Identified that original `#FF500A` fails WCAG AA (3.28:1 contrast against white).
     - Proposed and verified accessible darker variant `#C2410C` (5.18:1 contrast against white and white text on button) as default `ACCESSIBLE_ORANGE`, maintaining brand vibrancy while satisfying strict accessibility compliance.
     - Preset hex values are scoped directly as `--accent` on the template root container.
  3. Live Preview & Forms:
     - Implemented `TemplatePicker.jsx` with real-time responsive preview pane featuring an interactive 375px mobile / desktop viewport switcher.
     - Integrated `TemplatePicker` into `/w/books/new` (Step 4, defaulting to `user.defaultTemplate`) and `/w/books/:id/edit` (metadata, cover re-crop, template, and accent picker).
     - Server-side validation rejects invalid `template` and `accent` values with HTTP 400 Bad Request. Cover replacements cleanly destroy prior Cloudinary image public IDs server-side without re-running manuscript NLP analysis.
     - Added `/w/profile` allowing authors to configure bio and persist `defaultTemplate` for future books via `PATCH /api/me/profile`.
- **Reason**: Implement author-driven presentation customisation adhering to Spec §5, §12.3, and WCAG 2.1 AA accessibility guidelines.
- **Date**: 2026-10-04

## Phase 8 - Publisher Journey, AI Pitch Panel, Private Wishlist & Public Writer Profiles
- **Decision**:
  1. Publisher RBAC & Admin Approval Lifecycle:
     - Implemented `GET /admin/publishers?status=pending` and `PATCH /admin/publishers/:id` for manual publisher verification.
     - Approvals promote accounts to `status: 'active'`, `reviewStatus: 'approved'`, record `approvedAt`, and emit in-app notifications and immutable `AuditLog` records.
     - Rejections require an explanation (`reason`), demote the account role back to `reader`, set `reviewStatus: 'rejected'`, and log the audit entry.
     - Pending publishers attempting to access restricted features receive HTTP 403 with error code `PUBLISHER_PENDING`, redirecting to `/p/apply` status page.
  2. Confidential Acquisitions Wishlist:
     - Created `Wishlist` model with compound unique index `{ publisherId: 1, bookId: 1 }` and `{ publisherId: 1, createdAt: -1 }`.
     - Endpoints mounted under `GET /api/me/wishlist` and `GET/PUT/DELETE /api/me/wishlist/:bookId`, strictly locked behind `requireApprovedPublisher`.
     - Absolute privacy guarantee: Wishlist identities are strictly isolated to the authenticated publisher. Authors, readers, and competing publishers can never view wishlister names or companies; writers only receive aggregated interest counts (`Wishlist.countDocuments({ bookId })`), eliminating market front-running.
  3. Catalogue Scouting Filters & Index Optimization:
     - Extended `GET /books` with publisher filters: `minRating`, `completionMin`, `lengthBucket` (short `<150`, medium `150-350`, long `>350`), and `wishlisted=true`.
     - Added query indexes to `Book` model: `{ status: 1, 'stats.ratingAvg': -1 }`, `{ status: 1, 'stats.completionRate': -1 }`, and `{ status: 1, pageCount: 1 }`.
  4. AI Pitch Card, Prompt Injection Hardening & Resilient Fallback:
     - Manuscript text passed to LLM is wrapped in untrusted data delimiters (`<<<BEGIN UNTRUSTED MANUSCRIPT DATA>>>`) with explicit system instructions to ignore prompt injections and treat input strictly as raw narrative text.
     - Validated via Joi against `{ logline, genre, tone, targetAudience, forFansOf[] }`, cached on `Book.pitchCard` with input hash and generation timestamp.
     - Non-blocking fallback: Any model timeout or validation error automatically yields a template-constructed pitch card (`buildFallbackPitchCard`), ensuring document publishing and pitch viewing are never blocked.
     - Background generation is hooked into pipeline completion (`pipeline:document-ready`) on the `platform-maintenance` queue via `pitchWorker`.
     - Manual regeneration via `POST /books/:bookId/pitch/regenerate` is guarded to book owners and admins with a daily 3-call limit enforced via Redis key `pitch:regen:{bookId}:{day}`.
  5. Whole-Book Pitch Panel (`GET /books/:bookId/pitch`):
     - Compiles AI pitch card, whole-book mood summary (dominant emotions, intensity range), ensemble cast list, narrative pacing summary, audience traction metrics (reads, rating, reviews, completion, adds, private wishlist count), and writer snapshot.
     - Enforces access matrix: accessible to approved publishers, book owners, and platform admins; rejected with `PUBLISHER_PENDING` for pending applicants, and HTTP 403 for readers or other authors.
  6. Visual Component Reuse:
     - Extended `StoryArcTab` and `RelationshipsTab` with `summary={true}` and `initialData` support, rendering compact, read-only charts for the Pitch panel without duplicating Recharts or ReactFlow code.
     - Created `MoodSummaryCard` visual component displaying dominant emotion percentages, tone, and intensity ranges.
  7. Public Writer Profiles & Follow System:
     - Built `Follow` model with compound unique index `{ followerId: 1, writerId: 1 }` and `{ writerId: 1, createdAt: -1 }`.
     - Mounted `GET /writers/:username`, `PUT /writers/:username/follow`, `DELETE /writers/:username/follow` with self-follow prevention.
     - Public profile queries server-side record `profile_view` in `ViewEvent` deduplicated once per user per day.
     - Public `/writer/:username` page dynamically renders in the writer's chosen `defaultTemplate` (`Classic`, `Showcase`, or `Notebook`) with scoped `--accent`, featuring bio, published stories shelf, follow button, and `ReportButton`.
- **Reason**: Implement publisher talent scouting journey, AI pitch card, private wishlist, and public writer profiles per Spec §2, §3, §6, §12.7, and CLAUDE.md.
- **Date**: 2026-10-04


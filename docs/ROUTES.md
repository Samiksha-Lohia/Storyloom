# SceneCraft API Route Registry & Access Matrix

Auto-generated route audit documentation. Total endpoints registered: **111**.

| Method | Route Path | Auth Required | Allowed Roles | Description / Guard |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/` | No (Public) | Public | Standard route |
| `GET` | `/api/admin/books` | Yes | admin | Admin governance & oversight |
| `PATCH` | `/api/admin/books/:id` | Yes | admin | Admin governance & oversight |
| `GET` | `/api/admin/conversations/:id` | Yes | admin | Admin governance & oversight |
| `GET` | `/api/admin/publishers` | Yes | admin | Admin governance & oversight |
| `PATCH` | `/api/admin/publishers/:id` | Yes | admin | Admin governance & oversight |
| `GET` | `/api/admin/reports` | Yes | admin | Admin governance & oversight |
| `PATCH` | `/api/admin/reports/:id` | Yes | admin | Admin governance & oversight |
| `GET` | `/api/admin/stats` | Yes | admin | Admin governance & oversight |
| `GET` | `/api/admin/users` | Yes | admin | Admin governance & oversight |
| `PATCH` | `/api/admin/users/:id` | Yes | admin | Admin governance & oversight |
| `POST` | `/api/auth/login` | No (Public) | Public | Authentication & token management |
| `POST` | `/api/auth/logout` | Yes | All authenticated | Authentication & token management |
| `GET` | `/api/auth/me` | Yes | All authenticated | Authentication & token management |
| `POST` | `/api/auth/refresh` | No (Public) | Public | Authentication & token management |
| `POST` | `/api/auth/register` | No (Public) | Public | Authentication & token management |
| `GET` | `/api/books` | No (Public) | Public | Manuscript catalogue & reader |
| `POST` | `/api/books` | Yes | All authenticated | Manuscript catalogue & reader |
| `DELETE` | `/api/books/:bookId` | Yes | All authenticated | Manuscript catalogue & reader |
| `GET` | `/api/books/:bookId` | No (Public) | Public | Manuscript catalogue & reader |
| `PATCH` | `/api/books/:bookId` | Yes | All authenticated | Manuscript catalogue & reader |
| `POST` | `/api/books/:bookId/accept-terms` | Yes | All authenticated | Manuscript catalogue & reader |
| `GET` | `/api/books/:bookId/pages` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:bookId/pitch` | No (Public) | Public | Manuscript catalogue & reader |
| `POST` | `/api/books/:bookId/pitch/regenerate` | Yes | All authenticated | Manuscript catalogue & reader |
| `GET` | `/api/books/:bookId/scene-markers` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/arc` | No (Public) | Public | Manuscript catalogue & reader |
| `POST` | `/api/books/:id/analysis/ask` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/characters` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/characters/:characterId` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/continuity` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/mood` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/pitch` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/relationships` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/scenes` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/search` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/analysis/timeline` | No (Public) | Public | Manuscript catalogue & reader |
| `GET` | `/api/books/:id/reviews` | No (Public) | Public | Manuscript catalogue & reader |
| `POST` | `/api/books/:id/reviews` | Yes | All authenticated | Manuscript catalogue & reader |
| `DELETE` | `/api/books/:id/reviews/:reviewId` | Yes | All authenticated | Manuscript catalogue & reader |
| `PATCH` | `/api/books/:id/reviews/:reviewId` | Yes | All authenticated | Manuscript catalogue & reader |
| `PATCH` | `/api/books/:id/reviews/:reviewId/read` | Yes | All authenticated | Manuscript catalogue & reader |
| `GET` | `/api/books/writer/mine` | Yes | All authenticated | Manuscript catalogue & reader |
| `GET` | `/api/conversations` | Yes | All authenticated | Direct secure messaging |
| `GET` | `/api/conversations/:id` | Yes | All authenticated | Direct secure messaging |
| `PATCH` | `/api/conversations/:id` | Yes | All authenticated | Direct secure messaging |
| `GET` | `/api/conversations/:id/messages` | Yes | All authenticated | Direct secure messaging |
| `POST` | `/api/conversations/:id/messages` | Yes | All authenticated | Direct secure messaging |
| `GET` | `/api/documents` | Yes | All authenticated | Standard route |
| `POST` | `/api/documents` | Yes | All authenticated | Standard route |
| `DELETE` | `/api/documents/:documentId` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:documentId` | Yes | All authenticated | Standard route |
| `PATCH` | `/api/documents/:documentId` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:documentId/download` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/characters` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/characters/:characterId` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/characters/search` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/jobs` | Yes | All authenticated | Standard route |
| `POST` | `/api/documents/:id/jobs/:stage/retry` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/scenes` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/scenes/:sceneId` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/search` | Yes | All authenticated | Standard route |
| `POST` | `/api/documents/:id/search/ask` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/arc` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/continuity` | Yes | All authenticated | Standard route |
| `PATCH` | `/api/documents/:id/story/continuity/:id/status` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/dialogue` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/mood` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/relationships` | Yes | All authenticated | Standard route |
| `GET` | `/api/documents/:id/story/timeline` | Yes | All authenticated | Standard route |
| `GET` | `/api/me/library` | Yes | All authenticated | User library, profile & wishlist |
| `DELETE` | `/api/me/library/:bookId` | Yes | All authenticated | User library, profile & wishlist |
| `GET` | `/api/me/library/:bookId` | Yes | All authenticated | User library, profile & wishlist |
| `PUT` | `/api/me/library/:bookId` | Yes | All authenticated | User library, profile & wishlist |
| `PUT` | `/api/me/mature-ack` | Yes | All authenticated | User library, profile & wishlist |
| `PATCH` | `/api/me/profile` | Yes | All authenticated | User library, profile & wishlist |
| `PATCH` | `/api/me/settings` | Yes | All authenticated | User library, profile & wishlist |
| `GET` | `/api/me/wishlist` | Yes | publisher, admin | User library, profile & wishlist |
| `DELETE` | `/api/me/wishlist/:bookId` | Yes | publisher, admin | User library, profile & wishlist |
| `GET` | `/api/me/wishlist/:bookId` | Yes | publisher, admin | User library, profile & wishlist |
| `PUT` | `/api/me/wishlist/:bookId` | Yes | publisher, admin | User library, profile & wishlist |
| `GET` | `/api/notifications` | Yes | All authenticated | Standard route |
| `PATCH` | `/api/notifications/:id/read` | Yes | All authenticated | Standard route |
| `PATCH` | `/api/notifications/read-all` | Yes | All authenticated | Standard route |
| `GET` | `/api/notifications/unread-count` | Yes | All authenticated | Standard route |
| `GET` | `/api/publish-requests` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `POST` | `/api/publish-requests` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `GET` | `/api/publish-requests/:id` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `PATCH` | `/api/publish-requests/:id` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `DELETE` | `/api/publish-requests/blocks/:publisherId` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `PUT` | `/api/publish-requests/blocks/:publisherId` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `GET` | `/api/publish-requests/blocks/all` | Yes | publisher, writer, admin | Publishing offers & lifecycle |
| `POST` | `/api/reports` | Yes | All authenticated | Safety & copyright moderation |
| `POST` | `/api/reports/public-notice` | No (Public) | Public | Safety & copyright moderation |
| `PATCH` | `/api/reviews/:id/read` | Yes | All authenticated | Standard route |
| `POST` | `/api/uploads/avatar` | Yes | All authenticated | Standard route |
| `GET` | `/api/writer/:username` | No (Public) | Public | Author studio & analytics |
| `DELETE` | `/api/writer/:username/follow` | Yes | writer, admin | Author studio & analytics |
| `PUT` | `/api/writer/:username/follow` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writer/analytics` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writer/analytics/explain` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writer/profile/:id` | No (Public) | Public | Author studio & analytics |
| `GET` | `/api/writer/reviews` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writers/:username` | No (Public) | Public | Author studio & analytics |
| `DELETE` | `/api/writers/:username/follow` | Yes | writer, admin | Author studio & analytics |
| `PUT` | `/api/writers/:username/follow` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writers/analytics` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writers/analytics/explain` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/api/writers/profile/:id` | No (Public) | Public | Author studio & analytics |
| `GET` | `/api/writers/reviews` | Yes | writer, admin | Author studio & analytics |
| `GET` | `/health` | No (Public) | Public | Standard route |

## Public Routes Allowlist

- `GET /`
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/books`
- `GET /api/books/:bookId`
- `GET /api/books/:bookId/pages`
- `GET /api/books/:bookId/pitch`
- `GET /api/books/:bookId/scene-markers`
- `GET /api/books/:id/analysis/scenes`
- `GET /api/books/:id/analysis/characters`
- `GET /api/books/:id/analysis/characters/:characterId`
- `GET /api/books/:id/analysis/relationships`
- `GET /api/books/:id/analysis/timeline`
- `GET /api/books/:id/analysis/mood`
- `GET /api/books/:id/analysis/arc`
- `GET /api/books/:id/analysis/continuity`
- `GET /api/books/:id/analysis/pitch`
- `GET /api/books/:id/analysis/search`
- `POST /api/books/:id/analysis/ask`
- `GET /api/books/:id/reviews`
- `GET /api/writers/:username`
- `GET /api/writers/:username/books`
- `GET /api/writers/profile/:id`
- `GET /api/writer/profile/:id`
- `GET /api/writer/:username`
- `GET /api/reviews/book/:bookId`
- `POST /api/reports/public`
- `POST /api/reports/public-notice`

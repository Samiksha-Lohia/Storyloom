# Storyloom Backend

AI-Powered Interactive Story Analysis & Publishing Platform Backend.

## Prerequisites

- Node.js >= 18.0.0
- MongoDB
- Redis

## Environment Configuration

Create a `.env` file in `backend/` (you can copy `.env.example` as a template) and configure the following variables:

| Variable | Description | Default | Required in Production |
|---|---|---|---|
| `PORT` | API Server listening port | `5000` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` | No |
| `MONGO_URI` | MongoDB connection URI | - | **Yes** |
| `REDIS_URL` | Redis connection URL | - | **Yes** |
| `JWT_ACCESS_SECRET` | Secret key for JWT access tokens | - | **Yes** |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | - | **Yes** |
| `JWT_ACCESS_EXPIRY` | Access token lifetime | `15m` | No |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` | No |
| `MAX_FILE_SIZE_MB` | Maximum manuscript upload size in MB | `15` | No |
| `UPLOAD_DIR` | Local disk upload directory | `uploads/` | No |
| `STORAGE_PROVIDER` | Manuscript storage (`local`) | `local` | No |
| `CLOUDINARY_CLOUD_NAME`| Cloudinary Cloud Name for covers & avatars | - | **Yes** |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | - | **Yes** |
| `CLOUDINARY_API_SECRET`| Cloudinary API Secret | - | **Yes** |
| `ADMIN_EMAIL` | Email used when seeding initial admin | - | No |
| `ADMIN_PASSWORD` | Password used when seeding initial admin (>= 12 chars) | - | No |
| `OPENROUTER_API_KEY_1` | OpenRouter API Key for analysis pipeline | - | No |
| `OPENROUTER_MODEL_1` | OpenRouter Model identifier | `google/gemini-2.5-flash` | No |

## Scripts

```bash
# Start development server with hot-reload
npm run dev

# Run all backend tests
npm test

# Seed initial platform administrator account
npm run seed:admin

# Migrate existing legacy users to writers
npm run migrate:users

# Verify AI provider connection
npm run ai:ping
```

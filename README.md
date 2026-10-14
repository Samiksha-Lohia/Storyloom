# Storyloom

## Project Description

Storyloom is a web platform for writers, readers, and book publishers. Writers can upload manuscript drafts in formats such as PDF, Word (DOCX), or plain text. The platform extracts the text and runs an asynchronous background pipeline that breaks the manuscript into individual scenes and extracts story elements, including character profiles, character relationships, narrative timeline events, emotional tone, and potential continuity issues.

Readers can browse published manuscripts, save reading progress, submit reviews, and use an interactive story question-answering assistant that evaluates the story text directly to provide accurate, grounded answers without hallucinations or assumptions.

Publishers can discover manuscripts using catalog filters, review standardized book pitch cards, and make acquisition offers directly to writers. Once an offer is accepted, writers and publishers communicate through a real-time chat with automatic masking of private contact details (phone numbers and email addresses) to maintain author privacy. Administrators manage user accounts, review publisher applications, and resolve moderation reports.

## Tech Stack

| Layer / Role | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 19 | Client application, page routing, and view state management |
| Build Tool | Vite | Development server and client production bundling |
| Backend Server | Node.js, Express.js | REST API routing, request validation, and application logic |
| Database | MongoDB, Mongoose | Primary document database for users, books, and analysis data |
| Queue and Cache | Redis, BullMQ | Asynchronous job queues for manuscript processing and worker tasks |
| Real-Time Communication | Socket.io | Live author-publisher chat and asynchronous pipeline status events |
| Document Extraction | pdf-parse, Mammoth | Parsing raw text from PDF, Word (DOCX), and text files |
| Authentication | JSON Web Tokens (JWT), bcryptjs | Secure password hashing and stateless token-based authorization |
| Media Storage | Cloudinary, Multer | Manuscript file upload handling and book cover image hosting |
| AI & Retrieval | LLM API, Lexical RAG & Vector Embeddings | Narrative analysis, grounded lexical Q&A, and semantic vector search |

## Key Features

### Manuscript Analysis Pipeline
- Multi-format file upload support for PDF, Word (.docx), and plain text (.txt).
- Automatic scene segmentation with generated titles, summaries, and word counts.
- Character extraction identifying names, narrative roles (protagonist, antagonist, supporting), personality traits, and aliases.
- Interactive character relationship network featuring dual view modes (ReactFlow graph with character node focus and clean cards view), type pills with live counts, character dropdown, sentiment tone filters, and live search.
- Story timeline generation organizing plot events in chronological order.
- Emotional tone tracking measuring scene intensity and mood patterns.
- Plot continuity checks scanning for narrative discrepancies across scenes.
- Automated book pitch generation creating loglines, target demographics, and market hooks.
- Dedicated vector embeddings stage (`STAGES.EMBEDDINGS`) generating dense representations for scenes, character profiles, and dialogue records for semantic search.
- One-click story re-analysis enabling authors to re-run and synchronize insights on both new and existing stories.

### Reading Experience, Lexical Q&A & Semantic Search
- Distraction-free reader view with adjustable typography and reading modes.
- Personal library tracking for currently reading, saved, and completed books.
- Community reviews with five-star ratings and reader feedback.
- Grounded Story Q&A assistant utilizing a deterministic **lexical retrieval engine** (`story-qa.service.js`) with weighted scoring (token matches, exact-phrase bonuses, character entity matches), verbatim manuscript text hydration, bilingual English/Hindi (Devanagari) scoring, and strict anti-hallucination guardrails.
- Dedicated Semantic Vector Search (`search.service.js`) powered by cosine similarity against vectors generated during the worker's embeddings stage.

### Publisher Discovery and Acquisition
- Search and filtering by genre, word count, reader completion rates, and average rating.
- Book pitch cards summarizing core themes, audience fit, and comparable stories.
- Acquisition offer workflow allowing publishers to specify advance payments, royalties, and rights categories.
- Real-time author-publisher negotiation chat with automated masking of sensitive contact details until both parties consent.

### Administration and Safety
- Administrative dashboard displaying platform activity, registered users, and active books.
- Publisher verification pipeline to approve or decline publishing house accounts.
- Moderation queue for handling reported content, user disputes, and book takedowns.
- Audit logging tracking administrative actions for platform transparency.

## Retrieval Architecture: Lexical Q&A vs. Vector Semantic Search

Storyloom intentionally separates **Story Question Answering** from **Semantic Search** based on distinct technical requirements:

| Dimension | Grounded Story Q&A (`story-qa.service.js`) | Semantic Search (`search.service.js`) |
| :--- | :--- | :--- |
| **Retrieval Engine** | **Lexical & Entity Heuristic Scoring** | **Dense Vector Embeddings & Cosine Similarity** |
| **Pipeline Stage** | On-demand user query evaluation | Asynchronous background worker stage (`STAGES.EMBEDDINGS`) |
| **Scoring Formula** | `Exact Phrase (+20) + Character Name (+5) + Query Tokens (+3)` | Cosine similarity between query vector and stored document/scene vectors |
| **Data Grounding** | Verbatim manuscript text hydration sliced from character offsets | Indexed vectors across scenes, characters, and dialogue records |
| **Language Support** | Bilingual token scoring with English and Hindi (Devanagari) stopwords | Multi-modal text embedding representation |
| **Primary Advantage** | Zero vector DB overhead, 100% quote fidelity, deterministic fallback | Conceptual search across synonyms, themes, and paraphrased intent |

### Why Lexical Retrieval for Story Q&A?
Rather than relying on vector similarity—which can pull tangentially related scenes while missing exact plot details—Storyloom's Q&A engine evaluates paragraphs using lexical token scoring and entity co-occurrence. It hydrates verbatim text directly from manuscript character offsets (`Document.parsedText`), supplying the LLM with exact quotes under strict anti-hallucination instructions. If the AI provider is unavailable, it provides an instant deterministic fallback using the highest-scoring excerpt.

### The Dedicated Worker Embeddings Stage
The background worker (`pipeline.worker.js`) contains a dedicated stage (`STAGES.EMBEDDINGS`) executed after scene segmentation, character extraction, and dialogue summaries are finalized. It computes dense vector representations for:
1. **Scenes:** Title, summary, and full scene text.
2. **Characters:** Name, role description, and personality traits.
3. **Dialogue Summaries:** Conversation summary, key quotes, and tone.

These are stored in the MongoDB `Embedding` collection and queried via `search.service.js` for flexible semantic exploration.

## System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Application"]
        Browser["React Client (Vite)"]
    end

    subgraph ServerLayer["Backend API Server"]
        Express["Express.js Server"]
        AuthMiddleware["Authentication & RBAC Middleware"]
        SocketServer["Socket.io Server"]
        RouteHandlers["API Route Handlers"]
    end

    subgraph AsyncLayer["Asynchronous Task System"]
        Queue["BullMQ Job Queue"]
        Worker["Pipeline Background Worker"]
    end

    subgraph DataLayer["Storage and External Services"]
        MongoDB[("MongoDB Database")]
        RedisDB[("Redis (Queue State & Cache)")]
        CloudStorage["Cloudinary Media Storage"]
        AIModel["LLM API Service"]
    end

    Browser -->|HTTP Requests| Express
    Browser <-->|WebSocket Events| SocketServer
    Express --> AuthMiddleware
    AuthMiddleware --> RouteHandlers
    RouteHandlers --> MongoDB
    RouteHandlers -->|Dispatch Job| Queue
    RouteHandlers --> CloudStorage
    SocketServer <--> RedisDB
    Queue <--> RedisDB
    Queue --> Worker
    Worker --> MongoDB
    Worker --> AIModel
```

## Project Structure

```text
Storyloom/
├── backend/
│   ├── src/controllers/  # Request handlers for authentication, books, and analytics
│   ├── src/models/       # Mongoose schemas for users, books, scenes, and insights
│   ├── src/routes/       # Express API routes for public and protected endpoints
│   ├── src/services/     # Business logic, narrative analysis, and AI orchestration
│   ├── src/workers/      # BullMQ background worker executing the analysis pipeline
│   ├── src/analysis/     # Rule-based text processing, metrics, and boundary detection
│   ├── src/socket/       # Socket.io handlers for real-time chat and progress events
│   ├── src/parsers/      # Manuscript text extraction for PDF, DOCX, and TXT files
│   ├── src/middleware/   # JWT authentication, role authorization, and error handling
│   └── tests/            # Automated integration and unit test suites
└── frontend/
    ├── src/components/   # Reusable views and narrative insight tabs
    ├── src/pages/        # Views for reader, writer, publisher, and admin portals
    ├── src/services/     # HTTP client API endpoints and WebSocket connection
    ├── src/context/      # React context providers for authentication and state
    ├── src/layouts/      # Shell layouts with navigation and sidebars
    └── src/hooks/        # Custom React hooks for pipeline and state management
```

## API Overview

### Authentication and Account
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a new user account with role selection |
| POST | `/api/auth/login` | Authenticate user and issue JWT tokens |
| POST | `/api/auth/logout` | Revoke session tokens and log out user |
| POST | `/api/auth/refresh-token` | Exchange refresh token for a new access token |
| GET | `/api/auth/me` | Fetch authenticated user profile data |

### Books and Manuscripts
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/books` | List published books with filtering and pagination |
| GET | `/api/books/:id` | Retrieve single book details and published metadata |
| POST | `/api/books` | Create a new book record with uploaded manuscript |
| PATCH | `/api/books/:id` | Update book title, blurb, tags, or publishing status |
| DELETE | `/api/books/:id` | Delete an unpublished draft or owned book |
| POST | `/api/upload` | Upload manuscript files (PDF, DOCX, TXT) and cover artwork |

### Story Analysis and Processing
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/books/:id/analysis/process` | Trigger pipeline analysis on a book (supports `?force=true` for re-analysis) |
| GET | `/api/books/:id/analysis/pipeline-status` | Get current background job progress and step state |
| GET | `/api/books/:id/analysis/scenes` | Retrieve extracted scenes, titles, and narrative summaries |
| GET | `/api/books/:id/analysis/characters` | Retrieve extracted character profiles and roles |
| GET | `/api/books/:id/analysis/relationships` | Retrieve mapped character relationship pairs with sentiment |
| GET | `/api/books/:id/analysis/timeline` | Retrieve chronological narrative timeline events |
| GET | `/api/books/:id/analysis/mood` | Retrieve emotional arc tracking and intensity data |
| GET | `/api/books/:id/analysis/continuity` | Retrieve detected plot consistency issues |
| GET | `/api/books/:id/analysis/pitch` | Retrieve generated publisher pitch deck details |
| GET | `/api/books/:id/analysis/search` | Semantic vector search across story scenes, characters, and dialogues |
| POST | `/api/books/:id/analysis/ask` | Submit questions to the grounded lexical Q&A assistant |

### Reading and Reviews
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/me/library` | Retrieve user reading list, bookmarks, and read history |
| POST | `/api/me/library/progress` | Update current reading progress offset and page number |
| GET | `/api/reviews/book/:bookId` | List reviews and star ratings for a book |
| POST | `/api/reviews` | Submit a reader review and rating |
| DELETE | `/api/reviews/:id` | Remove a submitted review |

### Publisher Acquisition and Real-Time Chat
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/publisher/discover` | Search manuscripts with publishing metrics |
| POST | `/api/publish-requests` | Submit formal acquisition offer to a writer |
| PATCH | `/api/publish-requests/:id` | Accept, reject, or update an acquisition offer |
| GET | `/api/conversations` | List active user negotiation conversations |
| GET | `/api/conversations/:id/messages` | Retrieve conversation message history |
| POST | `/api/conversations/:id/messages` | Send chat message with automated contact masking |

### Administration
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/admin/stats` | Retrieve platform-wide KPIs, user counts, and book stats |
| GET | `/api/admin/users` | List and search registered accounts |
| PATCH | `/api/admin/users/:id` | Update user status, strike count, or suspension |
| GET | `/api/admin/publishers` | Review pending publisher verification requests |
| PATCH | `/api/admin/publishers/:id` | Approve or reject a publisher application |
| GET | `/api/admin/reports` | List open moderation reports |
| PATCH | `/api/admin/reports/:id` | Resolve moderation report and execute disciplinary action |

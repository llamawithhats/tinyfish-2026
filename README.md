# AutoIntern

TinyFish-powered internship application automation for ATS-hosted job pages. The stack is a Dockerized TypeScript monorepo with:

- `apps/web`: Next.js dashboard, Auth.js magic-link auth, and queueing API routes
- `apps/worker`: BullMQ workers for discovery, packet generation, and submission
- `packages/*`: shared domain contracts, env/config, TinyFish client, prompt builders, PDF renderer, and object storage helpers
- `prisma/schema.prisma`: the multi-user data model for profiles, credentials, sources, jobs, packets, runs, and audit events

## What v1 does

- Stores a structured candidate profile and encrypted ATS credentials
- Watches user-defined ATS sources such as Greenhouse, Lever, Ashby, Workable, and generic hosted apply pages
- Uses TinyFish async runs to scrape listings and application pages
- Generates a truthful one-page ATS-safe resume, cover letter, and structured screening answers
- Queues applications for review by default, with an explicit auto-submit account mode
- Falls back to `MANUAL_ACTION_REQUIRED` on CAPTCHA, MFA, broken uploaders, and unsupported flows

## Resume constraints

The resume prompt and renderer both enforce:

- one-page output
- no tables
- no multi-column layout
- no decorative elements or text boxes
- ATS-safe headings and truthful claims only

## Local development

1. Copy `.env.example` to `.env`.
2. Fill in `AUTH_SECRET`, `ENCRYPTION_KEY`, `TINYFISH_API_KEY`, and `LLM_API_KEY`.
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and apply the schema:

```bash
npx prisma generate
npx prisma db push
```

5. Start the website and worker in separate terminals:

```bash
npm run dev:web
npm run dev:worker
```

6. Or boot the full local stack with Docker:

```bash
docker compose up --build
```

Mail preview lives at `http://localhost:8025`, the app at `http://localhost:3000`, and MinIO console at `http://localhost:9001`.

## Key API routes

- `POST` / `PUT` `/api/profile`
- `POST /api/credentials`
- `POST /api/search-presets`
- `POST /api/job-sources`
- `GET /api/jobs`
- `GET /api/applications`
- `POST /api/jobs/:id/generate-packet`
- `POST /api/applications/:id/approve`
- `POST /api/settings/submission-mode`

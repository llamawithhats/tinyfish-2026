# AutoIntern

TinyFish-powered internship discovery and materials generation for ATS-hosted job pages. The stack is a Dockerized TypeScript monorepo with:

- `apps/web`: Next.js dashboard, prototype username/password auth, and queueing API routes
- `apps/worker`: BullMQ workers for discovery and packet generation
- `packages/*`: shared domain contracts, env/config, TinyFish client, prompt builders, PDF renderer, and object storage helpers
- `prisma/schema.prisma`: the multi-user data model for profiles, credentials, sources, jobs, packets, runs, and audit events

## What v1 does

- Stores a structured candidate profile
- Watches user-defined ATS sources such as Greenhouse, Lever, Ashby, Workable, and generic hosted apply pages
- Uses TinyFish async runs to scrape listings and application pages
- Generates a truthful one-page ATS-safe resume and cover letter for matched jobs
- Queues generated materials for review in a simple materials queue

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
3. Username/password auth is enabled by default for the prototype, so SMTP is optional unless you want to switch back to email links later.
4. Install dependencies:

```bash
npm install
```

5. Generate Prisma client and apply the schema:

```bash
npx prisma generate
npx prisma db push
```

6. Start the website and worker in separate terminals:

```bash
npm run dev:web
npm run dev:worker
```

7. Or boot the full local stack with Docker:

```bash
npm run docker:up
```

The app lives at `http://localhost:3000`, Mailpit is still available at `http://localhost:8025` if you want it, and the MinIO console is at `http://localhost:9001`.

If your terminal cannot find Docker Desktop's credential helper, use the repo wrapper commands instead of raw `docker compose`:

```bash
npm run docker:up
npm run docker:ps
npm run docker:logs
npm run docker:down
```

## Key API routes

- `POST` / `PUT` `/api/profile`
- `POST /api/search-presets`
- `POST /api/job-sources`
- `GET /api/jobs`
- `GET /api/applications`
- `POST /api/jobs/:id/generate-packet`

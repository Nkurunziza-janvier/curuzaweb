# e-businessRw

e-businessRw helps local businesses create an online storefront, publish products and services, receive customer requests, and manage their business through a dashboard. Platform administrators review business access and subscription payments.

## Project structure

```text
client/
├── public/                 Static assets served by Vite
├── src/
│   ├── app/                 App setup and route definitions
│   ├── components/          Shared UI, auth, onboarding, and notifications
│   ├── hooks/               Shared React hooks
│   ├── layouts/             Marketing, dashboard, and admin layouts
│   ├── pages/               Route-level screens
│   └── services/            API and authentication clients
└── server/
    ├── prisma/              Database schema, migrations, and seed data
    └── src/                 Express API, controllers, middleware, and validation
```

The React/Vite client and Express/Prisma API are in one repository. The client uses pnpm; the API uses npm and its own lockfile.

## Requirements

- Node.js 22
- pnpm 10.34.3 for the client
- PostgreSQL for the API

## Run locally

### 1. Configure the API

From `server/`, copy `.env.example` to `.env`, then set a real PostgreSQL `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters. Keep `.env` private; it is ignored by Git.

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run db:generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Create the PostgreSQL database named in `DATABASE_URL` before running migrations. For an existing database, use the migrations in `server/prisma/migrations` and the server README for migration details.

### 2. Run the client

In a second terminal from the repository root:

```powershell
pnpm install
pnpm dev
```

Vite proxies `/api` and `/uploads` to `http://127.0.0.1:5000` by default. Set `API_PROXY_TARGET` if the API runs elsewhere. See [`server/README.md`](server/README.md) for API configuration and operational notes.

## Build

```powershell
pnpm build
cd server
npm run build
```

Do not commit `.env` files, local uploads, build output, or dependency folders. Use `.env.example` for safe configuration templates.

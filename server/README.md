# UbucuruziHub API

Express and TypeScript REST API using Prisma and PostgreSQL. The server directory is colocated with the existing client repository.

## Configure

1. From this directory, create the environment file and open it:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

2. In `.env`, replace the `DATABASE_URL` example with your PostgreSQL username, password, host, port, and database name. Create that database first (for example, `ubucuruzihub` in pgAdmin). Set `JWT_SECRET` to a random value of at least 32 characters. Do not commit `.env`.
3. For the first migration, run `npx prisma migrate dev --name init`; for later migrations, run `npm run db:migrate`. Prisma CLI and the seed script load `.env` from this directory.
4. The Vite client uses the same-origin `/api` and `/uploads` routes by default; its dev server proxies them to `http://127.0.0.1:5000`. Set `API_PROXY_TARGET` when the API runs on a different host. Set `VITE_API_URL` in `../.env.local` only when intentionally bypassing this proxy.

`npm run db:generate` can succeed without `DATABASE_URL`; it generates the client but does not verify a database connection. Migrations, seeding, and starting the API require a valid `DATABASE_URL` in `server/.env`.

## Quote workflow

Quotes are calculated and persisted by the API using PostgreSQL decimal values. Business owners can create and revise quotes, apply fixed or percentage discounts, set expiry/deposit/payment terms and estimated completion dates, and cancel drafts. Customer links use opaque tokens (`/q/<token>`), not sequential quote numbers. Quote views, responses, expiry and messages are recorded for the business dashboard.

Apply pending schema changes with `npm run db:migrate`, then regenerate the Prisma client with `npm run db:generate`. The quote workflow does not send email or WhatsApp messages automatically; owners can copy the customer link or share it through WhatsApp. Customer acceptance records the decision only and does not collect payment.

## Onboarding location and images

The location step includes an interactive OpenStreetMap pin picker (no map API key required) with a link to view the selected coordinates in Google Maps. Business logos and cover photos can be uploaded from the device as JPEG, PNG, WebP, or GIF files up to 8 MB. Development uploads are served from `server/uploads`; keep that folder persistent. Use managed object storage when deploying multiple server instances.

## Database and development

```powershell
cd C:\Users\hp\OneDrive\Desktop\curuzaweb\client\server
npm install
# Copy .env.example to .env and set the real database credentials first
npm run db:generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Run the Vite client in a second terminal:

```powershell
cd ..
npm run dev
```

The database seed provides `demo@ubucuruzihub.com` and `admin@ubucuruzihub.com`, both with development password `UbucuruziDemo2026!`. Each seeded business owner account has that password as well. Do not reuse seed credentials in production.

`npm run build`, `npm test`, and `npm run db:studio` are available in the server directory.

# e-businessRw

The repository contains the e-businessRw web client and API server.

## Project structure

- `client/` — React, Vite, and TypeScript web application.
- `server/` — Express API, Prisma schema and migrations, and API tests.

## Run locally

Install dependencies in both applications with `npm install` from `client/` and `server/`.

Configure `server/.env` using `server/.env.example`, then run the API with `npm run dev` from `server/`. Run the web client with `npm run dev` from `client/`; its Vite proxy sends `/api` and `/uploads` requests to the API server.

Do not commit `.env` files, uploaded user content, generated builds, or dependency directories.

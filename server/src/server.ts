import { app } from "./app.js";
import { prisma } from "./config/prisma.js";
import { env } from "./config/env.js";

// Bind to IPv4 explicitly because the Vite same-origin proxy targets 127.0.0.1.
const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`e-businessRw API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

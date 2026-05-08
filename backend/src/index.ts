// EARLIEST POSSIBLE LOGGING - before any imports
try {
  console.error(`[STARTUP] >>> APPLICATION STARTING <<<`);
  console.error(`[STARTUP] Process: ${process.pid}`);
  console.error(`[STARTUP] Node: ${process.version}`);
} catch (e) {
  process.stderr.write(`[STARTUP] Logging failed: ${e}\n`);
}

import { Hono } from "hono";
import { cors } from "hono/cors";

// Log startup - this helps debug container startup issues
console.log(`[STARTUP] Application starting at ${new Date().toISOString()}`);
console.log(`[STARTUP] Environment:`, {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? "***set***" : "***missing***",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "***set***" : "***missing***",
});

console.log(`[STARTUP] About to import env.ts...`);
import "./env";
import { sampleRouter } from "./routes/sample";
import { projectsRouter } from "./routes/projects";
import { membersRouter } from "./routes/members";
import { performanceRouter } from "./routes/performance";
import { dataRouter } from "./routes/data";
import { usersRouter } from "./routes/users";
import { logger } from "hono/logger";
import { auth } from "./auth";

console.log(`[STARTUP] Environment variables validated`);

// Type the Hono app with user/session variables
const app = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost:8000$/,
  /^http:\/\/localhost:3000$/,
  /^http:\/\/127\.0\.0\.1:8000$/,
  /^http:\/\/127\.0\.0\.1:3000$/,
  /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/d[a-z0-9]+\.cloudfront\.net$/,
  /^https:\/\/app\.herolabel\.io$/,
  /^https:\/\/herolabel\.io$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Auth middleware - require a valid session for all API routes except /api/auth/* and /health
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path === "/health" || path.startsWith("/api/auth/")) {
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: { message: "Unauthorized" } }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/projects", projectsRouter);
app.route("/api", membersRouter);
app.route("/api/performance", performanceRouter);
app.route("/api/projects", dataRouter);
app.route("/api/users", usersRouter);

const port = Number(process.env.PORT) || 3000;

console.log(`[STARTUP] Server configured for port ${port}`);
console.log(`[STARTUP] Application ready to accept requests`);

export default {
  port,
  fetch: app.fetch,
};

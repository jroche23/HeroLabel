import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { sampleRouter } from "./routes/sample";
import { projectsRouter } from "./routes/projects";
import { membersRouter } from "./routes/members";
import { performanceRouter } from "./routes/performance";
import { dataRouter } from "./routes/data";
import { usersRouter } from "./routes/users";
import { logger } from "hono/logger";
import { auth } from "./auth";

// Type the Hono app with user/session variables
const app = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
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

export default {
  port,
  fetch: app.fetch,
};

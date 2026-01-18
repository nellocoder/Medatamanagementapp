import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import routes from "./routes.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-56fd5521/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount routes
// Mount at root (for when prefix is stripped by Supabase)
app.route("/", routes);
// Mount at prefix (for when prefix is preserved)
app.route("/make-server-56fd5521", routes);

Deno.serve(app.fetch);
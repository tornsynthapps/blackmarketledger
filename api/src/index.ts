import { Hono } from "hono";
import { cors } from "hono/cors";
import { Logger } from "./utils/logger";
import { authRouter } from "./auth";
import { Env } from "./types";

/**
 * Main Hono application for the Ledger API.
 * Configured with environment bindings for Cloudflare Workers.
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * Global middleware for CORS and debug logging.
 * Captures request details and status codes when DEBUG is enabled.
 */
app.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
    })
);

app.use("*", async (c, next) => {
    const logger = new Logger(c.env.DEBUG === "true");
    if (logger.enabled) {
        logger.info(`${c.req.method} ${c.req.url}`);
        logger.debug("Request headers", c.req.header());

        if (c.req.method === "POST" || c.req.method === "PUT") {
            try {
                const clone = c.req.raw.clone();
                const body = await clone.json();
                logger.debug("Request body", body);
            } catch {
                logger.debug("Could not parse request body for logging");
            }
        }
    }

    await next();

    logger.info(`Response status: ${c.res.status}`);
});

app.route("/auth", authRouter);

app.onError((err, c) => {
    const logger = new Logger(c.env.DEBUG === "true");
    logger.error("Unhandled error", err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
});

export default app;

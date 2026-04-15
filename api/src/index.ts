import { Hono } from "hono";
import { cors } from "hono/cors";
import { Logger } from "./utils/logger";
import { authRouter } from "./auth";
import { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
    })
);

// Debug logging middleware
app.use("*", async (c, next) => {
    const logger = new Logger(c.env.DEBUG === "true");
    if (logger.enabled) {
        logger.info(`${c.req.method} ${c.req.url}`);
        logger.debug("Request headers", c.req.header());

        // Avoid clone + JSON parse overhead outside debug mode.
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

import { Context } from "hono";
import { Env } from "../types";

/**
 * OpenAPI 3.0 specification for the Ledger API.
 * @returns (object): OpenAPI document object
 */
export const openApiSpec = {
    openapi: "3.0.0",
    info: {
        title: "Ledger API",
        version: "1.0.0",
        description: "Authentication and ledger management service for BlackMarket Ledger",
    },
    servers: [
        {
            url: "https://ledger.tornsynthapps.workers.dev",
            description: "Production server",
        },
    ],
    paths: {
        "/auth/login": {
            post: {
                summary: "Login",
                description: "Authenticate an existing user with userId and secretToken",
                operationId: "login",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["userId", "secretToken"],
                                properties: {
                                    userId: {
                                        type: "string",
                                        description: "Torn user ID",
                                        example: "1234567",
                                    },
                                    secretToken: {
                                        type: "string",
                                        description: "Secret authentication token",
                                        example: "abc123xyz",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Authentication successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        authenticated: { type: "boolean" },
                                        userId: { type: "integer" },
                                        username: { type: "string" },
                                        secretToken: { type: "string" },
                                        subscriptionValid: { type: "boolean" },
                                        validUntil: { type: "string", nullable: true },
                                    },
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request - missing or invalid parameters",
                    },
                    "401": {
                        description: "Unauthorized - invalid token or no account found",
                    },
                    "403": {
                        description: "Forbidden - account blocked",
                    },
                    "500": {
                        description: "Internal server error",
                    },
                },
            },
        },
        "/auth/signup": {
            post: {
                summary: "Signup",
                description: "Initiate or verify account creation with Torn verification",
                operationId: "signup",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    userId: {
                                        type: "string",
                                        description: "Torn user ID",
                                        example: "1234567",
                                    },
                                    mode: {
                                        type: "string",
                                        enum: ["initiate-message", "initiate-money", "verify"],
                                        description: "Signup mode",
                                        example: "initiate-message",
                                    },
                                    verifyCode: {
                                        type: "string",
                                        description: "Verification code (required for verify mode)",
                                        example: "123456",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Successful response",
                    },
                    "400": {
                        description: "Bad request",
                    },
                    "500": {
                        description: "Internal server error",
                    },
                },
            },
        },
        "/auth/reset-token": {
            post: {
                summary: "Forgot token",
                description: "Initiate or verify secret token reset",
                operationId: "resetToken",
                tags: ["Authentication"],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    userId: {
                                        type: "string",
                                        description: "Torn user ID",
                                        example: "1234567",
                                    },
                                    mode: {
                                        type: "string",
                                        enum: ["initiate", "verify"],
                                        description: "Reset mode",
                                        example: "initiate",
                                    },
                                    verifyCode: {
                                        type: "string",
                                        description: "Verification code (required for verify mode)",
                                        example: "123456",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Successful response",
                    },
                    "400": {
                        description: "Bad request",
                    },
                    "500": {
                        description: "Internal server error",
                    },
                },
            },
        },
    },
};

/**
 * Serve the OpenAPI specification as JSON.
 * @param c (Context): Hono context
 * @returns (Response): JSON response with OpenAPI spec
 */
export const openApiHandler = (c: Context<{ Bindings: Env }>) => {
    return c.json(openApiSpec);
};

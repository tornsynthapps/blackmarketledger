"use client";

export type BMLExtensionMessageType =
  | "HELLO"
  | "CONNECTION"
  | "GET_USER_INFO"
  | "EXTENSION_DB_SAVE"
  | "EXTENSION_DB_LOAD"
  | "VERIFY_SUBSCRIPTION"
  | "SUBSCRIPTION_STATUS"
  | "DRIVE_STATUS"
  | "DRIVE_LOAD_DATA"
  | "DRIVE_WRITE_DATA"
  | "DRIVE_DELETE_DATA"
  | "DRIVE_DISCONNECT";

export interface BMLExtensionRequest<TPayload = unknown> {
  type: BMLExtensionMessageType;
  payload?: TPayload;
}

export interface BMLExtensionResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
}

type LegacyRequest = {
  requestType:
    | "CONNECT"
    | "HELLO"
    | "CONNECTION"
    | "BML_SYNC"
    | "GET_USER_INFO"
    | "EXTENSION_DB_SAVE"
    | "EXTENSION_DB_LOAD"
    | "EXTENSION_DB_MIGRATE"
    | "VERIFY_SUBSCRIPTION";
  connectionToken?: string;
  apiKey?: string;
  pin?: string;
  payload?: unknown;
};

const EXTENSION_REQUEST_EVENT = "BML_EXTENSION_REQUEST";
const EXTENSION_RESPONSE_EVENT = "BML_EXTENSION_RESPONSE";
const EXTENSION_TIMEOUT_MS = 8000;

function normalizeLegacyRequest(request: LegacyRequest): BMLExtensionRequest {
  switch (request.requestType) {
    case "HELLO":
      return { type: "HELLO" };
    case "CONNECTION":
      return {
        type: "CONNECTION",
        payload: { connectionToken: request.connectionToken },
      };
    case "GET_USER_INFO":
      return { type: "GET_USER_INFO" };
    case "EXTENSION_DB_SAVE":
    case "EXTENSION_DB_MIGRATE":
      return { type: "EXTENSION_DB_SAVE", payload: { logs: request.payload } };
    case "EXTENSION_DB_LOAD":
      return { type: "EXTENSION_DB_LOAD" };
    case "VERIFY_SUBSCRIPTION":
      return {
        type: "VERIFY_SUBSCRIPTION",
        payload: { apiKey: request.apiKey },
      };
    case "BML_SYNC": {
      const syncPayload = (request.payload ?? {}) as {
        action?: string;
        data?: unknown;
      };

      if (syncPayload.action === "read") {
        return { type: "DRIVE_LOAD_DATA" };
      }

      if (syncPayload.action === "write") {
        return {
          type: "DRIVE_WRITE_DATA",
          payload: { data: syncPayload.data },
        };
      }

      if (syncPayload.action === "delete") {
        return { type: "DRIVE_DELETE_DATA" };
      }

      return { type: "DRIVE_STATUS" };
    }
    default:
      return { type: "HELLO" };
  }
}

export function sendToExtension<TData = unknown>(
  request: BMLExtensionRequest | LegacyRequest,
): Promise<BMLExtensionResponse<TData>> {
  const normalized =
    "requestType" in request ? normalizeLegacyRequest(request) : request;

  return new Promise((resolve) => {
    const messageId = crypto.randomUUID();
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", handler);
      window.clearTimeout(timeoutId);
    };

    const finish = (response: BMLExtensionResponse<TData>) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(response);
    };

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== EXTENSION_RESPONSE_EVENT) return;
      if (event.data?.id !== messageId) return;

      finish(
        event.data.response ?? {
          success: false,
          error: "Malformed extension response",
        },
      );
    };

    const timeoutId = window.setTimeout(() => {
      finish({ success: false, error: "Extension request timed out" });
    }, EXTENSION_TIMEOUT_MS);

    window.addEventListener("message", handler);
    window.postMessage(
      {
        type: EXTENSION_REQUEST_EVENT,
        id: messageId,
        message: normalized,
      },
      "*",
    );
  });
}

export const getConnectionString = (): string => {
  const connectionString = window.localStorage.getItem("connectionToken");
  if (connectionString) return connectionString;

  const newToken = generateConnectionString();
  saveConnectionToken(newToken);
  return newToken;
};

export const regenerateToken = (): string => {
  const newToken = generateConnectionString();
  saveConnectionToken(newToken);
  return newToken;
};

export const saveConnectionToken = (token: string) => {
  window.localStorage.setItem("connectionToken", token);
};

export const generateConnectionString = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

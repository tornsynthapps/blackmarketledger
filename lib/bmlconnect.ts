"use client";

export interface BMLRequest {
  requestType: "CONNECT" | "HELLO" | "CONNECTION" | "BML_SYNC" | "GET_USER_INFO" | "EXTENSION_DB_SAVE" | "EXTENSION_DB_LOAD" | "EXTENSION_DB_MIGRATE" | "VERIFY_SUBSCRIPTION";
  connectionToken?: string;
  apiKey?: string;
  payload?: any;
}

export interface BMLResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Sends a message to the browser extension and waits for a response.
 */
export const sendToExtension = (request: BMLRequest): Promise<BMLResponse> => {
  return new Promise((resolve) => {
    const messageId = Math.random().toString(36).substring(2, 15);
    
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "BML_EXTENSION_RESPONSE" && event.data?.id === messageId) {
        window.removeEventListener("message", handler);
        resolve(event.data.response);
      }
    };

    window.addEventListener("message", handler);

    window.postMessage({
      type: "BML_SYNC_REQUEST", // Keeping this for backward compatibility with content script for now
      id: messageId,
      ...request
    }, "*");

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({ success: false, error: "Extension request timed out" });
    }, 5000);
  });
};

export const getConnectionString = (): string => {
  const connectionString = window.localStorage.getItem("connectionToken");

  if (connectionString) {
    return connectionString;
  }

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

/**
 * Generates a random string.
 * @returns {string}
 */
export const generateConnectionString = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

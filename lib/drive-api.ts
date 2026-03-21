export type GoogleDriveSetupResponse =
  | {
      status: "SESSION_EXISTS";
      connection: {
        connected: boolean;
        hasData: boolean;
      };
    }
  | {
      status: "AUTH_REQUIRED";
      url: string;
    };

export type GoogleDriveStatusResponse = {
  connected: boolean;
  hasData: boolean;
  email?: string | null;
  scopes?: string[];
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getFunctionUrl(name: string) {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  return `${SUPABASE_URL}/functions/v1/${name}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

export async function initiateGoogleDriveSetup(input: {
  apiKey: string;
  redirectUri: string;
}) {
  const response = await fetch(getFunctionUrl("initiate-google-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readJson<GoogleDriveSetupResponse>(response);
}

export async function completeGoogleDriveSetup(input: {
  code: string;
  state: string;
}) {
  const response = await fetch(getFunctionUrl("handle-google-callback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return readJson<{
    success: true;
    connection: GoogleDriveStatusResponse;
  }>(response);
}

export async function getGoogleDriveStatus(apiKey: string, file?: string) {
  const response = await fetch(getFunctionUrl("sync-google-drive"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, action: "status", file }),
  });

  return readJson<{ success: true; data: GoogleDriveStatusResponse }>(response);
}

export async function loadGoogleDriveData(apiKey: string, file?: string) {
  const response = await fetch(getFunctionUrl("sync-google-drive"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, action: "read", file }),
  });

  return readJson<{
    success: true;
    data: unknown;
    meta: { connection: GoogleDriveStatusResponse };
  }>(response);
}

export async function writeGoogleDriveData(apiKey: string, data: unknown, file?: string) {
  const response = await fetch(getFunctionUrl("sync-google-drive"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, action: "write", data, file }),
  });

  return readJson<{ success: true; data: GoogleDriveStatusResponse }>(response);
}

export async function deleteGoogleDriveData(apiKey: string, file?: string) {
  const response = await fetch(getFunctionUrl("sync-google-drive"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, action: "delete", file }),
  });

  return readJson<{ success: true; data: GoogleDriveStatusResponse }>(response);
}

export async function disconnectGoogleDrive(apiKey: string) {
  const response = await fetch(getFunctionUrl("sync-google-drive"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, action: "disconnect" }),
  });

  return readJson<{ success: true; data: GoogleDriveStatusResponse }>(response);
}

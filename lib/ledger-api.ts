export interface AuthResponse {
    authenticated: boolean;
    userId: number;
    username: string;
    secretToken: string;
    subscriptionValid: boolean;
    validUntil: string | null;
    error?: string;
}

export interface InitiateSignupResponse {
    amount?: number;
    message?: string;
    verificationToken: string;
    error?: string;
}

export interface ResetTokenInitiateResponse {
    message: string;
    verificationToken: string;
    error?: string;
}

export interface ResetTokenVerifyResponse {
    success: boolean;
    userId: number;
    secretToken: string;
    error?: string;
}

function getLedgerApiUrl(): string {
    if (typeof window !== "undefined") {
        return (
            (window as any).__env?.NEXT_PUBLIC_LEDGER_API_URL ||
            "https://ledger.tornsynthapps.workers.dev"
        );
    }
    return "https://ledger.tornsynthapps.workers.dev";
}

export async function login(userId: string, secretToken: string): Promise<AuthResponse> {
    const url = `${getLedgerApiUrl()}/auth/login`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, secretToken }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return {
                authenticated: false,
                userId: 0,
                username: "",
                secretToken: "",
                subscriptionValid: false,
                validUntil: null,
                error: data.error || "Request failed",
            };
        }

        return data as AuthResponse;
    } catch (err) {
        clearTimeout(timeoutId);
        const errorMessage = err instanceof Error ? err.message : "Connection failed";
        return {
            authenticated: false,
            userId: 0,
            username: "",
            secretToken: "",
            subscriptionValid: false,
            validUntil: null,
            error: errorMessage.includes("abort") ? "Request timed out" : errorMessage,
        };
    }
}

export async function signupInitiate(
    userId: string,
    mode: "initiate-message" | "initiate-money"
): Promise<InitiateSignupResponse> {
    const url = `${getLedgerApiUrl()}/auth/signup`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, userId }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return { verificationToken: "", error: data.error || "Request failed" };
        }

        return data as InitiateSignupResponse;
    } catch (err) {
        clearTimeout(timeoutId);
        return {
            verificationToken: "",
            error: err instanceof Error ? err.message : "Connection failed",
        };
    }
}

export async function signupVerify(verificationToken: string): Promise<AuthResponse> {
    const url = `${getLedgerApiUrl()}/auth/signup`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "verify", verificationToken }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return {
                authenticated: false,
                userId: 0,
                username: "",
                secretToken: "",
                subscriptionValid: false,
                validUntil: null,
                error: data.error || "Request failed",
            };
        }

        return data as AuthResponse;
    } catch (err) {
        clearTimeout(timeoutId);
        return {
            authenticated: false,
            userId: 0,
            username: "",
            secretToken: "",
            subscriptionValid: false,
            validUntil: null,
            error: err instanceof Error ? err.message : "Connection failed",
        };
    }
}

export async function resetTokenInitiate(userId: string): Promise<ResetTokenInitiateResponse> {
    const url = `${getLedgerApiUrl()}/auth/reset-token`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "initiate", userId }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return { message: "", verificationToken: "", error: data.error || "Request failed" };
        }

        return data as ResetTokenInitiateResponse;
    } catch (err) {
        clearTimeout(timeoutId);
        return {
            message: "",
            verificationToken: "",
            error: err instanceof Error ? err.message : "Connection failed",
        };
    }
}

export async function resetTokenVerify(
    verificationToken: string
): Promise<ResetTokenVerifyResponse> {
    const url = `${getLedgerApiUrl()}/auth/reset-token`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "verify", verificationToken }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                userId: 0,
                secretToken: "",
                error: data.error || "Request failed",
            };
        }

        return data as ResetTokenVerifyResponse;
    } catch (err) {
        clearTimeout(timeoutId);
        return {
            success: false,
            userId: 0,
            secretToken: "",
            error: err instanceof Error ? err.message : "Connection failed",
        };
    }
}

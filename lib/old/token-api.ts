export interface AuthResponse {
    authenticated: boolean;
    userId: number;
    username: string;
    secretToken: string;
    subscriptionValid: boolean;
    validUntil: string | null;
    error?: string;
}

export interface InitiateDepositResponse {
    amount: number;
    verificationToken: string;
    error?: string;
}

export interface InitiateMessageResponse {
    message: string;
    verificationToken: string;
    error?: string;
}

const VERIFY_URL = process.env.NEXT_PUBLIC_TOKEN_AUTH_URL;

function getApiUrl(): string {
    if (!VERIFY_URL) {
        throw new Error("NEXT_PUBLIC_TOKEN_AUTH_URL is not configured.");
    }
    return VERIFY_URL.startsWith("http") ? VERIFY_URL : `https://${VERIFY_URL}`;
}

export async function signIn(userId: string, secretToken: string): Promise<AuthResponse> {
    const url = getApiUrl();
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", userId, secretToken }),
    });

    const data = await response.json();

    if (!response.ok) {
        return {
            authenticated: false,
            userId: 0,
            username: "",
            secretToken: "",
            subscriptionValid: false,
            validUntil: null,
            error: data.error,
        };
    }

    return data as AuthResponse;
}

export async function initiateDepositSignup(userId: string): Promise<InitiateDepositResponse> {
    const url = getApiUrl();
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate_deposit", userId }),
    });

    const data = await response.json();

    if (!response.ok) {
        return { amount: 0, verificationToken: "", error: data.error };
    }

    return data as InitiateDepositResponse;
}

export async function initiateMessageSignup(userId: string): Promise<InitiateMessageResponse> {
    const url = getApiUrl();
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate_message", userId }),
    });

    const data = await response.json();

    if (!response.ok) {
        return { message: "", verificationToken: "", error: data.error };
    }

    return data as InitiateMessageResponse;
}

export async function verifySignup(verificationToken: string): Promise<AuthResponse> {
    const url = getApiUrl();
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_signup", verificationToken }),
    });

    const data = await response.json();

    if (!response.ok) {
        return {
            authenticated: false,
            userId: 0,
            username: "",
            secretToken: "",
            subscriptionValid: false,
            validUntil: null,
            error: data.error,
        };
    }

    return data as AuthResponse;
}

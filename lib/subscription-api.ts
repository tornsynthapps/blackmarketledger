export interface SubscriptionStatus {
    userId: number;
    username: string | null;
    subscriptionValid: boolean;
    validUntil: string | null;
}

const VERIFY_URL = process.env.NEXT_PUBLIC_VERIFY_SUBSCRIPTION_URL;

export async function verifySubscription(apiKey: string): Promise<SubscriptionStatus> {
    if (!VERIFY_URL) {
        throw new Error("NEXT_PUBLIC_VERIFY_SUBSCRIPTION_URL is not configured.");
    }

    const normalizedUrl = VERIFY_URL.startsWith("http") ? VERIFY_URL : `https://${VERIFY_URL}`;

    const response = await fetch(normalizedUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error || "Subscription verification failed.");
    }

    return data as SubscriptionStatus;
}

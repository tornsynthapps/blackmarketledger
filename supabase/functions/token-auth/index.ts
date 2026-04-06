// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, jsonResponse } from "../_shared/drive.ts";

type TornBasicResponse = {
    profile?: {
        id?: number;
        name?: string;
        username?: string;
    };
};

const TRIAL_DAYS = 365;
const VERIFICATION_EXPIRY_MINUTES = 30;
const DEPOSIT_MIN = 50;
const DEPOSIT_MAX = 500;

const MESSAGES = [
    "BML account verification",
    "BML signup verification",
    "BlackMarketLedger auth",
    "BML token verification",
    "Verify BML account",
];

const TORN_WORDS = [
    "ghost",
    "pixel",
    "shadow",
    "ninja",
    "candy",
    "pyramid",
    "dragon",
    "storm",
    "thief",
    "hunter",
    "warrior",
    "knight",
    "mage",
    "rogue",
    "slayer",
    "demon",
    "angel",
    "spirit",
    "phantom",
    "vortex",
    "crystal",
    "emerald",
    "ruby",
    "sapphire",
    "diamond",
    "platinum",
    "gold",
    "silver",
    "bronze",
    "iron",
    "steel",
    "titanium",
    "obsidian",
    "aurora",
    "nebula",
    "cosmos",
    "galaxy",
    "comet",
    "meteor",
    "asteroid",
    "planet",
    "starfire",
    "icewing",
    "fireball",
    "thunder",
    "lightning",
    "blizzard",
    "hurricane",
    "tornado",
    "earthquake",
    "volcano",
    "avalanche",
    "tsunami",
    "eclipse",
    "horizon",
    "infinity",
    "eternal",
    "oblivion",
    "sanctum",
    "citadel",
    "fortress",
    "dungeon",
    "labyrinth",
];

function getRandomWord(): string {
    return TORN_WORDS[Math.floor(Math.random() * TORN_WORDS.length)];
}

function generateSecretToken(): string {
    return `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;
}

function generateVerificationToken(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
}

function hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

function getRandomAmount(): number {
    return Math.floor(Math.random() * (DEPOSIT_MAX - DEPOSIT_MIN + 1)) + DEPOSIT_MIN;
}

function getRandomMessage(): string {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action, userId, secretToken, verificationToken } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        if (action === "signin") {
            if (
                !userId ||
                typeof userId !== "string" ||
                !secretToken ||
                typeof secretToken !== "string"
            ) {
                return jsonResponse({ error: "Missing userId or secretToken" }, 400);
            }

            const numericUserId = parseInt(userId, 10);
            if (isNaN(numericUserId)) {
                return jsonResponse({ error: "Invalid userId" }, 400);
            }

            const tokenHash = hashToken(secretToken);

            const { data: existingUser, error: fetchError } = await supabase
                .from("user_tokens")
                .select("*")
                .eq("torn_user_id", numericUserId)
                .maybeSingle();

            if (fetchError) {
                return jsonResponse(
                    { error: "Database lookup failed: " + fetchError.message },
                    500
                );
            }

            if (!existingUser) {
                return jsonResponse({ error: "No account found. Please sign up first." }, 401);
            }

            if (existingUser.is_blocked) {
                return jsonResponse(
                    {
                        error: "Account is blocked due to too many failed attempts. Contact support.",
                    },
                    403
                );
            }

            if (existingUser.secret_token_hash !== tokenHash) {
                const newFailedAttempts = (existingUser.failed_attempts || 0) + 1;
                const shouldBlock = newFailedAttempts >= 5;

                await supabase
                    .from("user_tokens")
                    .update({
                        failed_attempts: newFailedAttempts,
                        is_blocked: shouldBlock,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("torn_user_id", numericUserId);

                if (shouldBlock) {
                    return jsonResponse(
                        {
                            error: "Account blocked due to too many failed attempts. Contact support.",
                        },
                        403
                    );
                }

                const remainingAttempts = 5 - newFailedAttempts;
                return jsonResponse(
                    {
                        error: `Invalid token. ${remainingAttempts} attempt(s) remaining before account is blocked.`,
                    },
                    401
                );
            }

            await supabase
                .from("user_tokens")
                .update({
                    failed_attempts: 0,
                    updated_at: new Date().toISOString(),
                })
                .eq("torn_user_id", numericUserId);

            const { data: subData } = await supabase
                .from("extension_subscriptions")
                .select("valid_until")
                .eq("torn_user_id", numericUserId)
                .maybeSingle();

            const validUntil = subData?.valid_until ?? null;
            const subscriptionValid = Boolean(
                validUntil && new Date(validUntil).getTime() > Date.now()
            );

            return jsonResponse({
                authenticated: true,
                userId: numericUserId,
                username: existingUser.username,
                secretToken: secretToken,
                subscriptionValid,
                validUntil,
            });
        }

        if (action === "initiate_deposit") {
            if (!userId || typeof userId !== "string") {
                return jsonResponse({ error: "Missing userId" }, 400);
            }

            const numericUserId = parseInt(userId, 10);
            if (isNaN(numericUserId)) {
                return jsonResponse({ error: "Invalid userId" }, 400);
            }

            const { data: existingUser } = await supabase
                .from("user_tokens")
                .select("id")
                .eq("torn_user_id", numericUserId)
                .maybeSingle();

            if (existingUser) {
                return jsonResponse({ error: "Account already exists. Please sign in." }, 400);
            }

            const amount = getRandomAmount();
            const token = generateVerificationToken();
            const expiresAt = new Date(
                Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000
            ).toISOString();

            await supabase.from("token_verification_temp").insert({
                torn_user_id: numericUserId,
                verification_token: token,
                verification_type: "deposit",
                amount_required: amount,
                message_required: null,
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
            });

            return jsonResponse({
                amount,
                verificationToken: token,
            });
        }

        if (action === "initiate_message") {
            if (!userId || typeof userId !== "string") {
                return jsonResponse({ error: "Missing userId" }, 400);
            }

            const numericUserId = parseInt(userId, 10);
            if (isNaN(numericUserId)) {
                return jsonResponse({ error: "Invalid userId" }, 400);
            }

            const { data: existingUser } = await supabase
                .from("user_tokens")
                .select("id")
                .eq("torn_user_id", numericUserId)
                .maybeSingle();

            if (existingUser) {
                return jsonResponse({ error: "Account already exists. Please sign in." }, 400);
            }

            const message = getRandomMessage();
            const token = generateVerificationToken();
            const expiresAt = new Date(
                Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000
            ).toISOString();

            await supabase.from("token_verification_temp").insert({
                torn_user_id: numericUserId,
                verification_token: token,
                verification_type: "message",
                amount_required: null,
                message_required: message,
                created_at: new Date().toISOString(),
                expires_at: expiresAt,
            });

            return jsonResponse({
                message,
                verificationToken: token,
            });
        }

        if (action === "verify_signup") {
            if (!verificationToken || typeof verificationToken !== "string") {
                return jsonResponse({ error: "Missing verificationToken" }, 400);
            }

            const { data: tempRecord, error: tempError } = await supabase
                .from("token_verification_temp")
                .select("*")
                .eq("verification_token", verificationToken)
                .maybeSingle();

            if (tempError) {
                return jsonResponse({ error: "Database lookup failed: " + tempError.message }, 500);
            }

            if (!tempRecord) {
                return jsonResponse(
                    { error: "Invalid or expired verification token. Please start fresh." },
                    400
                );
            }

            if (new Date(tempRecord.expires_at).getTime() < Date.now()) {
                await supabase
                    .from("token_verification_temp")
                    .delete()
                    .eq("verification_token", verificationToken);
                return jsonResponse(
                    { error: "Verification token expired. Please start fresh." },
                    400
                );
            }

            const tornApiKey = Deno.env.get("TORN_API_KEY");
            if (!tornApiKey) {
                return jsonResponse({ error: "Server configuration error" }, 500);
            }

            const fromTimestamp = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
            const userId = tempRecord.torn_user_id;

            const logsRes = await fetch(
                `https://api.torn.com/v2/user/log?target=${userId}&limit=100&from=${fromTimestamp}&striptags=true`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `ApiKey ${tornApiKey}`,
                        accept: "application/json",
                    },
                }
            );

            const logsData = (await logsRes.json()) as {
                logs?: Array<{
                    timestamp: number;
                    data?: {
                        sender?: number;
                        money?: number;
                        message?: string;
                    };
                }>;
            };

            const accountLogs = logsData.logs || [];
            let verified = false;

            for (const log of accountLogs) {
                const sender = log.data?.sender;
                const money = log.data?.money;
                const message = log.data?.message;

                if (sender !== userId) continue;

                if (tempRecord.verification_type === "deposit") {
                    if (money === tempRecord.amount_required) {
                        verified = true;
                        break;
                    }
                } else if (tempRecord.verification_type === "message") {
                    if (message === tempRecord.message_required) {
                        verified = true;
                        break;
                    }
                }
            }

            if (!verified) {
                return jsonResponse(
                    {
                        error: "Verification not found. Please ensure you sent the correct amount/message.",
                    },
                    400
                );
            }

            await supabase
                .from("token_verification_temp")
                .delete()
                .eq("verification_token", verificationToken);

            const usernameRes = await fetch(
                `https://api.torn.com/v2/user/${tempRecord.torn_user_id}?selections=basic&striptags=true`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `ApiKey ${tornApiKey}`,
                        accept: "application/json",
                    },
                }
            );

            const usernameData = (await usernameRes.json()) as TornBasicResponse;
            const username =
                usernameData?.profile?.name || usernameData?.profile?.username || "Unknown";

            const newSecretToken = generateSecretToken();
            const newTokenHash = hashToken(newSecretToken);
            const validUntil = new Date(
                Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();

            await supabase.from("user_tokens").insert({
                torn_user_id: tempRecord.torn_user_id,
                username: username,
                secret_token_hash: newTokenHash,
                failed_attempts: 0,
                is_blocked: false,
                valid_until: validUntil,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            await supabase.from("extension_subscriptions").upsert(
                {
                    torn_user_id: tempRecord.torn_user_id,
                    username: username,
                    valid_until: validUntil,
                },
                {
                    onConflict: "torn_user_id",
                }
            );

            return jsonResponse({
                authenticated: true,
                userId: tempRecord.torn_user_id,
                username,
                secretToken: newSecretToken,
                subscriptionValid: true,
                validUntil,
            });
        }

        return jsonResponse({ error: "Invalid action" }, 400);
    } catch (error) {
        return jsonResponse(
            { error: error instanceof Error ? error.message : "Unexpected server error" },
            500
        );
    }
});

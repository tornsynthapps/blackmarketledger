/**
 * Paced Token Bucket rate limiter implementation.
 * Capacity = X (requests per minute).
 * Refill = X/10 tokens every 6 seconds.
 * Allows initial burst of X, then paces at X/10 per 6s.
 */
export class NewRateLimiter {
    static readonly MIN_REQUESTS_PER_MINUTE = 1;
    static readonly MAX_REQUESTS_PER_MINUTE = 80;
    static readonly DEFAULT_REQUESTS_PER_MINUTE = 60;

    private readonly maxRequests: number;
    private tokens: number;
    private lastRefill: number;
    private globalPauseUntil: number = 0;

    constructor(requestsPerMinute: number) {
        this.maxRequests = Math.max(
            NewRateLimiter.MIN_REQUESTS_PER_MINUTE,
            Math.min(requestsPerMinute, NewRateLimiter.MAX_REQUESTS_PER_MINUTE)
        );
        this.tokens = this.maxRequests;
        this.lastRefill = Date.now();
    }

    /**
     * Pauses all requests globally across this limiter for a given number of milliseconds.
     */
    public pauseGlobal(ms: number): void {
        const target = Date.now() + ms;
        if (target > this.globalPauseUntil) {
            this.globalPauseUntil = target;
        }
    }

    /**
     * Acquires a slot in the rate limiter, waiting if necessary.
     * @returns (Promise<void>): Resolves when a slot is acquired
     */
    async acquire(): Promise<void> {
        while (true) {
            const now = Date.now();
            if (now < this.globalPauseUntil) {
                await new Promise((resolve) => setTimeout(resolve, this.globalPauseUntil - now));
                continue;
            }

            this.refill();

            if (this.tokens >= 1) {
                this.tokens -= 1;
                return;
            }

            const waitTime = this.getWaitTime();
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    /**
     * Attempts to acquire a slot without waiting.
     * @returns (boolean): True if slot acquired, false otherwise
     */
    tryAcquire(): boolean {
        const now = Date.now();
        if (now < this.globalPauseUntil) {
            return false;
        }

        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }

        return false;
    }

    /**
     * Gets the time to wait before a slot becomes available.
     * @returns (number): Milliseconds to wait (0 if slot available)
     */
    getWaitTime(): number {
        const now = Date.now();
        if (now < this.globalPauseUntil) {
            return this.globalPauseUntil - now;
        }

        this.refill();

        if (this.tokens >= 1) {
            return 0;
        }

        // We need 1 token. Next refill happens every 6 seconds (6000ms).
        const nextRefillIn = 6000 - (Date.now() - this.lastRefill);
        return Math.max(0, nextRefillIn + 10);
    }

    /**
     * Clears all tokens, forcing a wait for refill.
     */
    reset(): void {
        this.tokens = 0;
        this.lastRefill = Date.now();
    }

    /**
     * Returns the configured requests per minute limit.
     * @returns (number): Maximum requests per minute
     */
    getRequestsPerMinute(): number {
        return this.maxRequests;
    }

    /**
     * Returns the number of available slots in the current window.
     * @returns (number): Available slots (0 or positive)
     */
    getAvailableSlots(): number {
        this.refill();
        return Math.floor(this.tokens);
    }

    /**
     * Refills tokens based on elapsed time.
     * Refill rate: maxRequests / 10 tokens per 6 seconds.
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        
        if (elapsed >= 6000) {
            const refillIntervals = Math.floor(elapsed / 6000);
            const tokensToAdd = refillIntervals * (this.maxRequests / 10);
            
            this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
            this.lastRefill = now - (elapsed % 6000);
        }
    }
}

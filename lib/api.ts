/**
 * Token bucket rate limiter implementation.
 * @param requestsPerMinute (number): Maximum requests allowed per minute (1-80)
 */
export class NewRateLimiter {
    static readonly MIN_REQUESTS_PER_MINUTE = 1;
    static readonly MAX_REQUESTS_PER_MINUTE = 80;
    static readonly DEFAULT_REQUESTS_PER_MINUTE = 60;

    private readonly windowMs: number;
    private readonly maxRequests: number;
    private timestamps: number[] = [];

    constructor(requestsPerMinute: number) {
        this.windowMs = 60 * 1000;
        this.maxRequests = Math.max(
            NewRateLimiter.MIN_REQUESTS_PER_MINUTE,
            Math.min(requestsPerMinute, NewRateLimiter.MAX_REQUESTS_PER_MINUTE)
        );
    }

    /**
     * Acquires a slot in the rate limiter, waiting if necessary.
     * @returns (Promise<void>): Resolves when a slot is acquired
     */
    async acquire(): Promise<void> {
        while (true) {
            this.cleanupExpiredTimestamps();

            if (this.timestamps.length < this.maxRequests) {
                this.timestamps.push(Date.now());
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
        this.cleanupExpiredTimestamps();

        if (this.timestamps.length < this.maxRequests) {
            this.timestamps.push(Date.now());
            return true;
        }

        return false;
    }

    /**
     * Gets the time to wait before a slot becomes available.
     * @returns (number): Milliseconds to wait (0 if slot available)
     */
    getWaitTime(): number {
        const validTimestamps = this.getValidTimestamps();

        if (validTimestamps.length < this.maxRequests) {
            return 0;
        }

        const oldest = Math.min(...validTimestamps);
        const windowStart = Date.now() - this.windowMs;
        return oldest - windowStart + 10;
    }

    /**
     * Clears all timestamps, resetting the limiter.
     */
    reset(): void {
        this.timestamps = [];
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
        this.cleanupExpiredTimestamps();
        return Math.max(0, this.maxRequests - this.timestamps.length);
    }

    /**
     * Gets timestamps within the current window.
     * @returns (number[]): Array of valid timestamps
     */
    private getValidTimestamps(): number[] {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        return this.timestamps.filter((t) => t > windowStart);
    }

    /**
     * Removes all timestamps outside the current window.
     */
    private cleanupExpiredTimestamps(): void {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        while (this.timestamps.length > 0 && this.timestamps[0] <= windowStart) {
            this.timestamps.shift();
        }
    }
}

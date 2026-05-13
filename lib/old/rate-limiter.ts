import { NewRateLimiter } from "../api";
import { getTornApiRateLimit, getWeav3rApiRateLimit } from "./api-keys";

export interface RateLimiter {
    acquire: () => Promise<void>;
    tryAcquire: () => boolean;
    getWaitTime: () => number;
    reset: () => void;
    pauseGlobal: (ms: number) => void;
}

export function createRateLimiter(requestsPerMinute: number): RateLimiter {
    const limiter = new NewRateLimiter(requestsPerMinute);

    return {
        acquire: () => limiter.acquire(),
        tryAcquire: () => limiter.tryAcquire(),
        getWaitTime: () => limiter.getWaitTime(),
        reset: () => limiter.reset(),
        pauseGlobal: (ms: number) => limiter.pauseGlobal(ms),
    };
}

// Singletons for shared rate limiting
export const tornRateLimiter = createRateLimiter(getTornApiRateLimit());
export const weav3rRateLimiter = createRateLimiter(getWeav3rApiRateLimit());

export function updateRateLimiter(limiter: RateLimiter, requestsPerMinute: number): RateLimiter {
    return createRateLimiter(requestsPerMinute);
}

interface RateLimiter {
  acquire: () => Promise<void>;
  tryAcquire: () => boolean;
  getWaitTime: () => number;
}

export function createRateLimiter(requestsPerMinute: number): RateLimiter {
  const windowMs = 60 * 1000;
  const maxRequests = Math.max(1, Math.min(requestsPerMinute, 1000));
  
  const timestamps: number[] = [];

  return {
    async acquire() {
      while (true) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // First, remove all expired timestamps (outside the window)
        while (timestamps.length > 0 && timestamps[0] <= windowStart) {
          timestamps.shift();
        }
        
        // If under limit, add current timestamp and proceed
        if (timestamps.length < maxRequests) {
          timestamps.push(now);
          return;
        }
        
        // At/over limit - wait for oldest to expire, then loop
        const oldest = timestamps[0];
        const waitTime = oldest - windowStart + 10;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    },

    tryAcquire() {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      const validTimestamps = timestamps.filter(t => t > windowStart);
      
      if (validTimestamps.length < maxRequests) {
        validTimestamps.push(now);
        timestamps.length = 0;
        timestamps.push(...validTimestamps);
        return true;
      }
      
      return false;
    },

    getWaitTime() {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      const validTimestamps = timestamps.filter(t => t > windowStart);
      
      if (validTimestamps.length < maxRequests) {
        return 0;
      }
      
      const oldest = Math.min(...validTimestamps);
      return oldest - windowStart + 10;
    }
  };
}

export function updateRateLimiter(limiter: RateLimiter, requestsPerMinute: number): RateLimiter {
  return createRateLimiter(requestsPerMinute);
}

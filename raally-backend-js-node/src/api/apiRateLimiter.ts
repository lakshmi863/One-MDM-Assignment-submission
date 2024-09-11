import rateLimit from 'express-rate-limit';
import GlobalSettingsService from '../services/globalSettingsService';

/**
 * Convenience function to create request rate limitation.
 * It accepts the maximum number of requests that API will accept in the given time window.
 * Under the hood, it uses the RateLimit library: https://www.npmjs.com/package/express-rate-limit
 *
 * @param max Maximum number of requests to accept within the given time window.
 * @param window Time window for rate limit in seconds. Default value is one second.
 * @returns RateLimit middleware object that can be attached to the router.
 */
export function createRateLimiter(max: number, window: number = 1) {
  return rateLimit({
    max,
    windowMs: window * 1000,  // Convert seconds to milliseconds
    message: 'Too many requests, please try again later.',  // Adjust the error message as needed
    skip: async function (req) {
      const useRateLimit = await GlobalSettingsService.getUseRateLimit(req);
      if (req.method === 'OPTIONS' || !useRateLimit) {
        return true;
      }

      if (req.originalUrl.endsWith('/import')) {
        return true;
      }

      return false;
    }
  });
}

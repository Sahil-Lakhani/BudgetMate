/**
 * Client-side rate limiting utility
 * Prevents abuse by throttling API calls locally
 */

const RATE_LIMIT_CONFIG = {
  // Action name -> { maxRequests, windowMs }
  'gemini-analyze': { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
  'gemini-insights': { maxRequests: 3, windowMs: 60000 }, // 3 requests per minute
  'firestore-write': { maxRequests: 20, windowMs: 60000 } // 20 writes per minute
};

/**
 * Check if an action is rate limited
 * @param {string} actionName - Name of the action to check
 * @throws {Error} If rate limit is exceeded
 */
export function checkRateLimit(actionName) {
  const config = RATE_LIMIT_CONFIG[actionName];
  
  if (!config) {
    console.warn(`No rate limit configured for action: ${actionName}`);
    return; // No limit configured, allow the action
  }
  
  const storageKey = `rateLimit_${actionName}`;
  const now = Date.now();
  
  // Get existing timestamps from localStorage
  let timestamps = [];
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      timestamps = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading rate limit data:', error);
    timestamps = [];
  }
  
  // Filter out timestamps outside the current window
  timestamps = timestamps.filter(ts => now - ts < config.windowMs);
  
  // Check if we've exceeded the limit
  if (timestamps.length >= config.maxRequests) {
    const oldestTimestamp = Math.min(...timestamps);
    const timeUntilReset = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
    
    const error = new Error(`You're doing that too often. Please wait ${timeUntilReset} seconds and try again.`);
    error.userFacing = true;
    throw error;
  }
  
  // Add current timestamp and save
  timestamps.push(now);
  try {
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
}

/**
 * Reset rate limit for an action (useful for testing or manual reset)
 * @param {string} actionName - Name of the action to reset
 */
export function resetRateLimit(actionName) {
  const storageKey = `rateLimit_${actionName}`;
  localStorage.removeItem(storageKey);
}

/**
 * Get current rate limit status for an action
 * @param {string} actionName - Name of the action to check
 * @returns {Object} Status object with remaining requests and reset time
 */
export function getRateLimitStatus(actionName) {
  const config = RATE_LIMIT_CONFIG[actionName];
  
  if (!config) {
    return null;
  }
  
  const storageKey = `rateLimit_${actionName}`;
  const now = Date.now();
  
  let timestamps = [];
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      timestamps = JSON.parse(stored);
    }
  } catch {
    timestamps = [];
  }
  
  // Filter out timestamps outside the current window
  timestamps = timestamps.filter(ts => now - ts < config.windowMs);
  
  const remaining = Math.max(0, config.maxRequests - timestamps.length);
  const resetTime = timestamps.length > 0 
    ? Math.min(...timestamps) + config.windowMs 
    : now;
  
  return {
    remaining,
    resetTime: new Date(resetTime),
    limit: config.maxRequests,
    windowMs: config.windowMs
  };
}

const noRateLimit = (req, res, next) => next();

// Rate limiting is intentionally disabled for all routes.
const apiLimiter = noRateLimit;
const authLimiter = noRateLimit;
const examSubmissionLimiter = noRateLimit;

module.exports = {
  apiLimiter,
  authLimiter,
  examSubmissionLimiter
};

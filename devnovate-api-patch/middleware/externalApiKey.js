// Auth for third-party callers (not browser sessions). Checks a shared
// secret in the `x-api-key` header against EXTERNAL_API_KEY in the env.
// Mirrors the style of ../middleware/auth.js — throws, relies on
// errorHandlerMiddleware (via express-async-errors / try-catch in the route)
// to turn it into a JSON response.
const AppError = require('../errors/AppError');

module.exports = function externalApiKey(req, res, next) {
  const provided = req.headers['x-api-key'];
  const expected = process.env.EXTERNAL_API_KEY;

  if (!expected) {
    // Fail closed: if the operator hasn't configured a key, refuse rather
    // than silently allowing unauthenticated access to this route.
    throw new AppError('External API is not configured', 503);
  }
  if (!provided || provided !== expected) {
    throw new AppError('Invalid or missing API key', 401);
  }
  next();
};

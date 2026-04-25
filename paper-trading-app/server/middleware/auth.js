const { verifyToken } = require('../utils/jwt');

/**
 * Express middleware that verifies the JWT from the HttpOnly cookie.
 * Attaches the decoded payload to req.user on success.
 * Returns 401 if the token is missing, invalid, or expired.
 */
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = authMiddleware;

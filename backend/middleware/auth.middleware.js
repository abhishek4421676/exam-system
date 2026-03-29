const { verifyToken } = require('../utils/jwt.util');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Basic token format validation
    if (!token || token.length < 20) {
      logger.warn('Authentication failed: Invalid token format', { ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Validate decoded data
      if (!decoded.user_id || !decoded.email || !decoded.role || !decoded.tenant_id) {
        throw new Error('Invalid token payload');
      }

      if (req.tenant_id && Number(decoded.tenant_id) !== Number(req.tenant_id)) {
        logger.warn('Authentication failed: token tenant mismatch', {
          token_tenant_id: decoded.tenant_id,
          request_tenant_id: req.tenant_id,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Token does not belong to this tenant'
        });
      }

      // Attach user data to request
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        tenant_id: decoded.tenant_id,
        tenant_subdomain: decoded.tenant_subdomain
      };

      next();
    } catch (error) {
      logger.warn('Authentication failed: Token verification failed', {
        ip: req.ip,
        error: error.message
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if missing
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        req.user = {
          user_id: decoded.user_id,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
          tenant_id: decoded.tenant_id,
          tenant_subdomain: decoded.tenant_subdomain
        };
      } catch (error) {
        // Token invalid, but continue without user
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};

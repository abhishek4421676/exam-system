/**
 * Role-based authorization middleware
 * Checks if user has required role to access resource
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden. Insufficient permissions.',
          requiredRole: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: error.message
      });
    }
  };
};

/**
 * Check if user is admin
 */
const isTenantAdmin = (req, res, next) => {
  return authorize('admin', 'tenant_admin')(req, res, next);
};

/**
 * Check if user is teacher
 */
const isTeacher = (req, res, next) => {
  return authorize('teacher')(req, res, next);
};

/**
 * Check if user is student
 */
const isStudent = (req, res, next) => {
  return authorize('student')(req, res, next);
};

/**
 * Check if user is tenant admin or teacher
 */
const isTenantAdminOrTeacher = (req, res, next) => {
  return authorize('admin', 'tenant_admin', 'teacher')(req, res, next);
};

/**
 * Check if user is tenant admin, teacher, or student
 */
const isAdminOrStudent = (req, res, next) => {
  return authorize('admin', 'tenant_admin', 'teacher', 'student')(req, res, next);
};

module.exports = {
  authorize,
  isTenantAdmin,
  isTeacher,
  isStudent,
  isTenantAdminOrTeacher,
  isAdminOrStudent
};

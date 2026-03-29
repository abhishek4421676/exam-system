const Tenant = require('../models/Tenant');
const logger = require('../config/logger');

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app']);

const parseSubdomainFromHost = (host) => {
  if (!host) return null;

  const hostWithoutPort = host.split(':')[0].toLowerCase();
  const hostParts = hostWithoutPort.split('.').filter(Boolean);

  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return process.env.DEFAULT_TENANT_SUBDOMAIN || null;
  }

  if (hostParts.length < 3) {
    return process.env.DEFAULT_TENANT_SUBDOMAIN || null;
  }

  const candidate = hostParts[0] === 'www' ? hostParts[1] : hostParts[0];

  if (!candidate || RESERVED_SUBDOMAINS.has(candidate)) {
    return null;
  }

  return candidate;
};

const resolveTenant = async (req, res, next) => {
  try {
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = (forwardedHost || req.headers.host || req.hostname || '').split(',')[0].trim();

    const headerSubdomain = req.headers['x-tenant-subdomain'];
    const subdomain = (headerSubdomain || parseSubdomainFromHost(host) || '').toString().toLowerCase();

    if (!subdomain) {
      logger.warn('Tenant resolution failed: subdomain missing', {
        host,
        path: req.path,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Tenant subdomain is required'
      });
    }

    const tenant = await Tenant.findBySubdomain(subdomain);

    if (!tenant) {
      logger.warn('Tenant resolution failed: unknown tenant', {
        subdomain,
        host,
        path: req.path,
        ip: req.ip
      });

      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    req.tenant = tenant;
    req.tenant_id = tenant.tenant_id;

    next();
  } catch (error) {
    logger.error('Tenant resolution error', {
      error: error.message,
      path: req.path,
      ip: req.ip
    });

    return res.status(500).json({
      success: false,
      message: 'Tenant resolution failed',
      error: error.message
    });
  }
};

module.exports = {
  resolveTenant,
  parseSubdomainFromHost
};

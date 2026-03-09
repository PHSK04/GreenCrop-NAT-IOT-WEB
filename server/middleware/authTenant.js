const jwt = require('jsonwebtoken');

// Factory that receives db wrapper (must expose setSessionContext)
module.exports = function (db) {
  const openPaths = new Set([
    '/api/login',
    '/api/auth/login',
    '/api/auth/social',
    '/api/register',
    '/api/send-otp',
    '/api/verify-otp',
    '/api/health'
  ]);

  return async function authTenant(req, res, next) {
    try {
      // Allow public endpoints
      if (openPaths.has(req.path)) return next();

      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
      const payload = jwt.verify(token, secret);
      req.user = payload;

      let tenantId = payload.tenant_id || payload.tenant || payload.tid;
      // Backward compatibility: older tokens used tenant_id='public'.
      // When account-bound mode is active, fall back to user id so app/web sync per account.
      if ((tenantId === 'public' || tenantId === 'PUBLIC') && payload.id !== undefined && payload.id !== null) {
        tenantId = String(payload.id);
      }
      if (!tenantId) return res.status(403).json({ error: 'Token missing tenant_id' });

      req.tenant = tenantId;

      // Set DB session context if available (for MSSQL RLS)
      if (db && typeof db.setSessionContext === 'function') {
        try {
          await db.setSessionContext(tenantId);
        } catch (e) {
          console.error('Warning: failed to set DB session context', e);
        }
      }

      next();
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

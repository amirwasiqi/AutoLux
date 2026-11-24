
export const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } });
  if (!req.user.roles.some((role) => allowed.includes(role))) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission.' } });
  }
  next();
};

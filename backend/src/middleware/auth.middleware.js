const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }

  try {
    const token = authorization.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
}

module.exports = authenticate;
// Archivo: ./backend/middlewares/authMiddleware.js
const ensureSuperUser = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida.' });
    }
  
    if (req.user.role !== 'Superusuario') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Superusuario.' });
    }
  
    next();
  };
  
  module.exports = { ensureSuperUser };
  
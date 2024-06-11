const passport = require('passport');

const authenticateUser = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Error en autenticación JWT:', err);
      return res.status(500).json({ message: 'Error en la autenticación JWT' });
    }
    if (!user) {
      console.log('Usuario no autorizado');
      return res.status(401).json({ message: 'Usuario no autorizado' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = authenticateUser;

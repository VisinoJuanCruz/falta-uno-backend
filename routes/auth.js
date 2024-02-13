// auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Ruta para el inicio de sesión

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Error en autenticación local:', err);
      return res.status(500).json({ message: 'Error en la autenticación local' });
    }
    if (!user) {
      console.log('Usuario no encontrado???');
      return res.status(401).json({ message: 'Usuario no encontrado en la base de datos' });
    }
    if (err || !user) {
      return res.status(401).json({ message: 'Usuario no encontrado o contraseña incorrecta' });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Error al iniciar sesión:', err);
        return res.status(500).json({ message: 'Error al iniciar sesión' });
      }
      console.log('Inicio de sesión exitoso');
      return res.send(user);
    });
  })(req, res, next); // <-- Aquí debe ir esta parte
});


// Ruta para obtener el perfil del usuario autenticado
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.send(req.user);
});

module.exports = router;

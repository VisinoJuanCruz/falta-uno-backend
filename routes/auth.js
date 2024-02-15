// auth.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();

// Ruta para el inicio de sesión
router.post('/login', async (req, res) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Error en autenticación local:', err);
      return res.status(500).json({ message: 'Error en la autenticación local' });
    }
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ message: 'Usuario no encontrado en la base de datos' });
    }
    req.logIn(user, { session: false }, async (err) => {
      if (err) {
        console.error('Error al iniciar sesión:', err);
        return res.status(500).json({ message: 'Error al iniciar sesión' });
      }
      console.log('Inicio de sesión exitoso');
      // Generar token JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      // Devolver los datos del usuario sin la contraseña
      const userData = { _id: user._id, name: user.name, mail: user.mail, whatsapp: user.whatsapp, equiposCreados: user.equiposCreados };
      return res.json({ token, user: userData });
    });
  })(req, res);
});

// Middleware para verificar el token JWT
const authenticateJWT = (req, res, next) => {
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

// Ruta para obtener el perfil del usuario autenticado
router.get('/profile', authenticateJWT, (req, res) => {
  // Devolver los datos del usuario sin la contraseña
  const userData = { _id: req.user._id, name: req.user.name, mail: req.user.mail, whatsapp: req.user.whatsapp, equiposCreados: req.user.equiposCreados };
  res.json(userData);
});

module.exports = router;

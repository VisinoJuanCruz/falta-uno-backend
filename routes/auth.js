// auth.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const nodemailer = require('nodemailer');

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
      await user.populate('complejos')
      // Generar token JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      // Devolver los datos del usuario sin la contraseña
      const userData = { _id: user._id, name: user.name, mail: user.mail, whatsapp: user.whatsapp, equiposCreados: user.equiposCreados, role: user.role, complejos: user.complejos };
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
  const userData = { _id: req.user._id, name: req.user.name, mail: req.user.mail, whatsapp: req.user.whatsapp, equiposCreados: req.user.equiposCreados, role: req.user.role, complejos: req.user.complejos };
  
  res.json(userData);
});

router.post('/reset-password-request', async (req, res) => {
  const { mail } = req.body;
  

  try {
    // Busca al usuario por su correo electrónico
    const user = await User.findOne({ mail });
    console.log(user)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Genera un token único
    const token = jwt.sign({ userId: user._id }, "una_cadena_secreta_aleatoria", { expiresIn: '1h' });

    // Almacena el token en la base de datos
    user.resetPasswordToken = token;
    await user.save();

    // Envía un correo electrónico al usuario con un enlace para restablecer la contraseña
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Usar otro servicio para producción
      auth: {
        user: 'visinodeveloper@gmail.com', // Tu correo
        pass: 'snnr owsq zmmr dsjh ' // Tu contraseña
      }
    });
    const mailOptions = {
      from: 'your-email@example.com',
      to: mail,
      subject: 'Restablecimiento de Contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: http://localhost:5173/reset-password/${token}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error al enviar correo electrónico:', error);
        return res.status(500).json({ message: 'Error al enviar correo electrónico' });
      } else {
        console.log('Correo electrónico enviado:', info.response);
        return res.status(200).json({ message: 'Correo electrónico enviado con éxito' });
      }
    });
  } catch (error) {
    console.error('Error al solicitar restablecimiento de contraseña:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;

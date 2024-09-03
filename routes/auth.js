const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { sendWelcomeEmail, sendVerificationEmail } = require('../utils/mailer');

const router = express.Router();


// Ruta para el inicio de sesión
router.post('/login', async (req, res) => {
  passport.authenticate('local', { session: false }, async (err, user, info) => {
    if (err) {
      console.error('Error en autenticación local:', err);
      return res.status(500).json({ message: 'Error en la autenticación local' });
    }
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ message: 'Usuario no encontrado en la base de datos' });
    }

    // Verificar si el usuario ha verificado su email
    if (!user.isVerified) {
      console.log('Usuario no verificado');
      return res.status(403).json({ message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico.' });
    }

    req.logIn(user, { session: false }, async (err) => {
      if (err) {
        console.error('Error al iniciar sesión:', err);
        return res.status(500).json({ message: 'Error al iniciar sesión' });
      }
      console.log('Inicio de sesión exitoso');
      await user.populate('complejos');
      
      // Generar token JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

      // Devolver los datos del usuario sin la contraseña
      const userData = {
        _id: user._id,
        name: user.name,
        mail: user.mail,
        whatsapp: user.whatsapp,
        equiposCreados: user.equiposCreados,
        role: user.role,
        complejos: user.complejos,
      };

      return res.json({ token, user: userData });
    });
  })(req, res);
});

router.post('/register', async (req, res) => {
  try {
    const { mail, name, whatsapp, password } = req.body;

    // Verificar si el usuario ya está registrado
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar token de verificación
    const verificationToken = jwt.sign({ mail }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Crear el nuevo usuario
    const newUser = new User({
      mail,
      password: hashedPassword,
      name,
      whatsapp,
      isVerified: false,
      verificationToken,  // Guardamos el token en el usuario
      equiposCreados: [],
      role: 'Usuario',
      complejos: []
    });

    await newUser.save();

    // Enviar correo de verificación
    await sendVerificationEmail(newUser.mail, verificationToken);

    // Responder con un mensaje al frontend
    res.status(201).json({ message: 'Usuario creado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
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

// Ruta para crear un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { mail, name, whatsapp, password } = req.body;

    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ mail }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const newUser = new User({
      mail,
      password: hashedPassword,
      name,
      whatsapp,
      equiposCreados: [],
      role: 'Usuario',
      complejos: [],
      isVerified: false,
      verificationToken
    });

    await newUser.save();
    await sendVerificationEmail(newUser.mail, verificationToken);

    res.status(201).json({ message: 'Usuario creado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
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


// Archivo: backend/routes/auth.js
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ mail: decoded.mail, verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Elimina el token después de verificar
    await user.save();

    res.status(200).json({ message: 'Cuenta verificada exitosamente. Ahora puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al verificar email:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar email' });
  }
});


// Endpoint para reenviar el email de verificación
router.post('/resend-verification', async (req, res) => {
  try {
    const { mail } = req.body;

    const user = await User.findOne({ mail });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'El usuario ya ha verificado su email.' });
    }

    // Generar un nuevo token de verificación
    const verificationToken = jwt.sign({ mail: user.mail }, process.env.JWT_SECRET, { expiresIn: '1d' });
    user.verificationToken = verificationToken;
    await user.save();

    // Reenviar el email de verificación
    await sendVerificationEmail(user.mail, verificationToken);

    res.status(200).json({ message: 'Email de verificación reenviado exitosamente.' });
  } catch (error) {
    console.error('Error al reenviar el email de verificación:', error);
    res.status(500).json({ message: 'Error al reenviar el email de verificación.' });
  }
});



module.exports = router;

// Archivo: backend/routes/users.js
const express = require('express');
const passport = require('passport');

const bcrypt = require('bcrypt');
const User = require('../models/user');
const {sendWelcomeEmail} = require('../utils/mailer');

const router = express.Router();


// Ruta protegida que requiere autenticación
router.get('/perfil', passport.authenticate('jwt', { session: false }), (req, res) => {
  // Si la autenticación es exitosa, el usuario está disponible en req.user
  res.json({ user: req.user });
});
// Obtener todos los usuarios
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate('complejos').populate('equiposCreados')
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo usuario
router.post('/users', async (req, res) => {
  try {
    const { mail, name, whatsapp, password } = req.body;
    console.log('Datos recibidos:', mail, name, whatsapp, password);

    // Verifica si el correo electrónico ya está registrado
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Encripta la contraseña antes de guardarla en la base de datos
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      mail,
      password: hashedPassword, // Almacena la contraseña encriptada
      name,
      whatsapp,
      equiposCreados: [], // Agrega la propiedad equiposCreados como un array vacío
      role: 'Usuario',
      complejos: [] //
    });

    const savedUser = await newUser.save();
    console.log('Usuario guardado:', savedUser);
    await sendWelcomeEmail(newUser.mail);
    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/profile/change-password', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  // Verificar que se hayan proporcionado tanto la contraseña antigua como la nueva
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Debe proporcionar la contraseña antigua y la nueva' });
  }
  
  const userId = req.user._id;
  
  
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log(isMatch)
    if (!isMatch) {
      return res.status(400).json({ message: 'La contraseña anterior es incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Busca al usuario por su token de restablecimiento de contraseña
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(404).json({ message: 'Token no válido o expirado. Por favor, solicita un nuevo enlace para restablecer la contraseña.' });
    }

    // Cambia la contraseña del usuario y elimina el token de restablecimiento
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    await user.save();

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;

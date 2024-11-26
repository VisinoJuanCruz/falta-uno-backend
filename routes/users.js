// Archivo: backend/routes/users.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const User = require('../models/user');
const Player = require('../models/player')
const { sendVerificationEmail} = require('../utils/mailer');

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

// Nueva ruta en el backend para devolver solo el nombre del usuario
router.get('/users/:userId/comunication-info', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select('name whatsapp habilitarWhatsapp');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario' });
  }
});
// Actualizar los datos de un usuario
router.put('/users/:userId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { oldPassword, newPassword, name, whatsapp, habilitarWhatsapp } = req.body;
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si se proporciona oldPassword, verificar si es correcta
    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });
      }

      // Hashear y actualizar con la nueva contraseña
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar otros datos del usuario
    user.name = name;
    user.whatsapp = whatsapp;
    user.habilitarWhatsapp = habilitarWhatsapp;

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Crear un nuevo usuario
router.post('/users', async (req, res) => {
  try {
    const { mail, name, whatsapp, password } = req.body;

    // Verifica si el correo electrónico ya está registrado
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Verifica si el correo electrónico es válido
    if (!/\S+@\S+\.\S+/.test(mail)) {
      return res.status(400).json({ error: 'El correo electrónico no es válido.' });
    }

    // Encripta la contraseña antes de guardarla en la base de datos
    const hashedPassword = await bcrypt.hash(password, 10);

    // Genera el token de verificación
    const verificationToken = jwt.sign({ mail }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Crea el nuevo usuario
    const newUser = new User({
      mail,
      password: hashedPassword,
      name,
      whatsapp,
      equiposCreados: [],
      role: 'Usuario',
      complejos: [],
      isVerified: false, // El usuario no está verificado inicialmente
      verificationToken // Guarda el token de verificación
    });

    const savedUser = await newUser.save();

    // Enviar email de verificación
    await sendVerificationEmail(newUser.mail, verificationToken);

    res.status(201).json({ message: 'Usuario creado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.' });
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor. Inténtelo de nuevo más tarde.' });
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

router.get('/users/:userId/linked-players', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const linkedPlayers = await Player.find({ usuarioVinculado: userId }).populate('equipo');
   
    res.status(200).json(linkedPlayers);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener jugadores vinculados', error });
  }
});

router.put('/users/:userId/unlink-player/:playerId',async (req, res) => {
  const { userId, playerId } = req.params;

  try {
    // Buscar al usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Buscar al jugador
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado' });
    }

    // Verificar si el jugador está vinculado al usuario
    if (!user.jugadoresVinculados.includes(playerId)) {
      return res.status(400).json({ message: 'El jugador no está vinculado a este usuario' });
    }

    // Quitar el jugador de la lista de jugadores vinculados del usuario
    user.jugadoresVinculados = user.jugadoresVinculados.filter(
      (id) => id.toString() !== playerId
    );
    await user.save();

    // Actualizar el estado del jugador
    player.estadoVinculacion = 'pending';
    player.usuarioVinculado = null;
    await player.save();

    res.status(200).json({ message: 'Jugador desvinculado correctamente' });
  } catch (error) {
    console.error('Error al desvincular jugador:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener el número de solicitudes de vinculación
router.get('/user/solicitudes/count/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Busca al usuario por ID y selecciona solo el campo solicitudesVinculacion
    const user = await User.findById(userId).select('solicitudesVinculacion');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Devuelve la longitud del array de solicitudes de vinculación
    res.json({ count: user.solicitudesVinculacion.length });
  } catch (error) {
    console.error('Error al obtener la cantidad de solicitudes de vinculación:', error);
    res.status(500).json({ message: 'Error al obtener la cantidad de solicitudes de vinculación' });
  }
});



module.exports = router;

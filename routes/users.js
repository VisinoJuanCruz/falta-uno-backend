const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();

// Obtener todos los usuarios
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo usuario
router.post('/users', async (req, res) => {
  try {
    const { mail, name, whatsapp, password } = req.body;
    console.log('Datos recibidos:', mail, name, whatsapp, password);

    // Encripta la contraseña antes de guardarla en la base de datos
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      mail,
      password: hashedPassword, // Almacena la contraseña encriptada
      name,
      whatsapp,
      equiposCreados: [], // Agrega la propiedad equiposCreados como un array vacío
    });

    const savedUser = await newUser.save();
    console.log('Usuario guardado:', savedUser);
    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

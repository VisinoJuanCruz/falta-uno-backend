const express = require('express');
const router = express.Router();
const Complejo = require('../models/complejo');
const User = require('../models/user');

// Obtener todos los complejos
router.get('/complejos', async (req, res) => {
  try {
    const complejos = await Complejo.find().populate('user'); // Popula el campo 'equipo' con la información del equipo
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Obtener un complejo por ID
router.get('/complejos/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }
    res.json(complejo);
  } catch (error) {
    console.error('Error al obtener complejo por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo complejo
router.post('/complejos', async (req, res) => {
  try {
    const { nombre, imagen, direccion, telefono, whatsapp, instagram, userId } = req.body;
    
    const userExists = await User.findById(userId)
    if (!userExists) {
      return res.status(400).json({ error: 'El usuario especificado no existe' });
    }


    const nuevoComplejo = new Complejo({
      nombre,
      imagen,
      direccion,
      telefono,
      whatsapp,
      instagram,
      userId,
      canchas: [] // Inicialmente no hay canchas asociadas al complejo
    });

    
    console.log(nuevoComplejo)
    const savedComplejo = await nuevoComplejo.save();

    await User.findByIdAndUpdate(userId, { $push: { complejos: savedComplejo._id } });
    console.log('Complejo guardado:', savedComplejo);
    res.status(201).json(savedComplejo);
  } catch (error) {
    console.error('Error al agregar complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

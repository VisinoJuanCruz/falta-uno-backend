const express = require('express');
const router = express.Router();
const Cancha = require('../models/cancha');

// Obtener todas las canchas
router.get('/', async (req, res) => {
  try {
    const canchas = await Cancha.find();
    res.json(canchas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear una nueva cancha
router.post('/', async (req, res) => {
  const cancha = new Cancha({
    nombre: req.body.nombre,
    tipo: req.body.tipo,
    alAireLibre: req.body.alAireLibre,
    disponibilidad: req.body.disponibilidad
  });

  try {
    const nuevaCancha = await cancha.save();
    res.status(201).json(nuevaCancha);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

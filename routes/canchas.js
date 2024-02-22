const express = require('express');
const router = express.Router();
const Cancha = require('../models/cancha');

// Obtener todas las canchas
router.get('/', async (req, res) => {
  try {
    const canchas = await Cancha.find();
    res.json(canchas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crear una nueva cancha
router.post('/', async (req, res) => {
  const cancha = new Cancha({
    capacidadJugadores: req.body.capacidadJugadores,
    alAireLibre: req.body.alAireLibre,
    materialPiso: req.body.materialPiso,
    precio:req.body.precio,
  });

  try {
    const nuevaCancha = await cancha.save();
    res.status(201).json(nuevaCancha);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

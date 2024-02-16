const express = require('express');
const router = express.Router();
const Cliente = require('../models/client');

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crear un nuevo cliente
router.post('/', async (req, res) => {
  const cliente = new Cliente({
    nombre: req.body.nombre,
    imagen: req.body.imagen,
    direccion: req.body.direccion,
    telefono: req.body.telefono,
    whatsapp: req.body.whatsapp,
    instagram: req.body.instagram
  });

  try {
    const nuevoCliente = await cliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

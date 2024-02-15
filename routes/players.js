// routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');

const router = express.Router();

// Obtener todos los jugadores
router.get('/players', async (req, res) => {
  try {
    const players = await Player.find().populate('equipo'); // Popula el campo 'equipo' con la información del equipo
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo jugador
router.post('/players', async (req, res) => {
  try {
    const { name, image, puntajeAtacando, puntajeDefendiendo, puntajeAtajando, creadoPor, equipoId } = req.body;

    // Verificar si el equipo existe
    const teamExists = await Team.findById(equipoId);
    if (!teamExists) {
      return res.status(400).json({ error: 'El equipo especificado no existe' });
    }

    // Crear el nuevo jugador con el ID del equipo asociado
    const newPlayer = new Player({
      name,
      image,
      puntajeAtacando,
      puntajeDefendiendo,
      puntajeAtajando,
      creadoPor,
      equipo: equipoId // Establecer el ID del equipo
    });

    const savedPlayer = await newPlayer.save();

    // Actualizar el equipo para incluir el ID del nuevo jugador en el array 'jugadores'
    await Team.findByIdAndUpdate(equipoId, { $push: { jugadores: savedPlayer._id } });

    res.status(201).json(savedPlayer);
  } catch (error) {
    console.error('Error al agregar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar jugador' });
  }
});

module.exports = router;

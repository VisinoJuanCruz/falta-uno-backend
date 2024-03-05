// routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');

const router = express.Router();

// Obtener todos los jugadores con paginación
router.get('/players', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Página solicitada (predeterminada: 1)
  const limit = parseInt(req.query.limit) || 16; // Tamaño de la página (predeterminado: 10)

  try {
    const count = await Player.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;

    const players = await Player.find()
      .populate('equipo')
      .skip(skip)
      .limit(limit);

    res.json({
      totalPlayers: count,
      totalPages,
      currentPage: page,
      players
    });
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

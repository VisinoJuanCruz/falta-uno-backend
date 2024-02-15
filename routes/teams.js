const express = require('express');
const passport = require('passport');
const Team = require('../models/team');
const Player = require('../models/player');

const router = express.Router();

// Obtener todos los equipos
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo equipo
router.post('/teams', async (req, res) => {
  try {
    const { creadoPor, jugadores, escudo, localidad, instagram, nombre } = req.body;

    const newTeam = new Team({
      jugadores,
      nombre,
      escudo,
      localidad,
      instagram,
      creadoPor, // Utiliza el userId obtenido del usuario autenticado
    });

    const savedTeam = await newTeam.save();
    res.status(201).json(savedTeam);
  } catch (error) {
    console.error('Error al crear equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear equipo' });
  }
});

// Agregar un jugador a un equipo
router.post('/teams/:id/add-player', async (req, res) => {
  try {
    const teamId = req.params.id;
    const playerId = req.body.playerId; // El ID del jugador que se va a agregar al equipo

    // Verifica si el equipo existe
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Verifica si el jugador existe
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Agrega el ID del jugador al array de jugadores del equipo
    team.jugadores.push(playerId);
    await team.save();

    res.status(200).json({ message: 'Jugador agregado exitosamente al equipo' });
  } catch (error) {
    console.error('Error al agregar jugador al equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar jugador al equipo' });
  }
});

module.exports = router;

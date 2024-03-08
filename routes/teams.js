const express = require('express');
const passport = require('passport');
const Team = require('../models/team');
const Player = require('../models/player');
const User = require('../models/user');

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

// Obtener un team por ID
router.get('/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team no encontrado' });
    }
    res.json(team);
  } catch (error) {
    console.error('Error al obtener team por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Crear un nuevo equipo
router.post('/teams', async (req, res) => {
  try {
    const { creadoPor, jugadores, escudo, localidad, instagram, nombre } = req.body;

    // Si el campo escudo está vacío, asignar la imagen predeterminada
    const escudoUrl = escudo || 'https://i.pinimg.com/originals/5a/f3/f2/5af3f2e3d949a142fb666dd04136380f.jpg';

    const newTeam = new Team({
      jugadores,
      nombre,
      escudo: escudoUrl,
      localidad,
      instagram,
      creadoPor, // Utiliza el userId obtenido del usuario autenticado
    });

    const savedTeam = await newTeam.save();
    await User.findByIdAndUpdate(creadoPor, { $push: { equiposCreados: savedTeam._id } });
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

// Obtener los equipos de un usuario específico
router.get('/teams/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const teams = await Team.find({ creadoPor: userId });
    res.json(teams);
  } catch (error) {
    console.error('Error al obtener equipos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener equipos del usuario' });
  }
});

// Eliminar un equipo y sus jugadores asociados
router.delete('/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    // Busca y elimina el equipo por su ID
    const deletedTeam = await Team.findByIdAndDelete(teamId);
    if (!deletedTeam) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Elimina todos los jugadores asociados al equipo eliminado
    await Player.deleteMany({ equipo: teamId });

    // Quita el equipo de la lista de equipos creados del usuario que lo creó
    await User.updateOne({ _id: deletedTeam.creadoPor }, { $pull: { equiposCreados: teamId } });

    res.status(200).json({ message: 'Equipo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar equipo' });
  }
});


module.exports = router;

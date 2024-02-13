const express = require('express');
const Team = require('../models/team');

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
    const { jugadores, escudo, creador, localidad, instagram } = req.body;

    const newTeam = new Team({
      jugadores,
      nombre,
      escudo,
      creador,
      localidad,
      instagram,
      agregadoPor:req.session.user.userId,
    });

    const savedTeam = await newTeam.save();
    res.status(201).json(savedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

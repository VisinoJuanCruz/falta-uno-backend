// routes/players.js
const express = require('express');
const Player = require('../models/player');

const router = express.Router();

// Obtener todos los jugadores
router.get('/players', async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo jugador
router.post('/players', async (req, res) => {
  try {
    const { name, image, puntajeAtacando, puntajeDefendiendo, puntajeAtajando } = req.body;
    
    const newPlayer = new Player({
      name,
      image,
      puntajeAtacando,
      puntajeDefendiendo,
      puntajeAtajando,
    });

    const savedPlayer = await newPlayer.save();
    res.status(201).json(savedPlayer);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

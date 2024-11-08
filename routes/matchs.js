const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Team = require('../models/team');
const Match = require('../models/match'); // Asegúrate de que este modelo exista
const mongoose = require('mongoose');

// Agregar un partido
router.post('/:teamId/add-match', async (req, res) => {
  try {
    const { tipoPartido, equipo, equipoOponente, jugadoresEquipo, jugadoresOponente, fecha, resultado } = req.body;

    // Verificar si el equipo existe
    const equipoExistente = await Team.findById(equipo);
    if (!equipoExistente) {
      return res.status(400).json({ error: 'El equipo registrado no existe' });
    }

    // Verificar que haya al menos 5 jugadores en el equipo
    if (jugadoresEquipo.length < 5) {
      return res.status(400).json({ error: 'Debes seleccionar al menos 5 jugadores para tu equipo' });
    }

    // Lógica según el tipo de partido
    if (tipoPartido === 'Entrenamiento') {
      req.body.equipoOponente = equipo;
      req.body.jugadoresOponente = jugadoresEquipo.map(j => ({ jugador: j.jugador, goles: j.goles }));
    } else if (tipoPartido === 'Amistoso') {
      // Si `equipoOponente` es un ObjectId, verificamos si el equipo oponente está registrado en la plataforma
      if (mongoose.Types.ObjectId.isValid(equipoOponente)) {
        const equipoOponenteExistente = await Team.findById(equipoOponente);
        if (!equipoOponenteExistente) {
          return res.status(400).json({ error: 'El equipo oponente no existe en la plataforma' });
        }
      }
      // Si `equipoOponente` es un String, es el nombre del equipo oponente no registrado
      else if (typeof equipoOponente === 'string' && equipoOponente.trim() === '') {
        return res.status(400).json({ error: 'Debe proporcionar un nombre para el equipo oponente en un partido amistoso no registrado' });
      }
    } else if (tipoPartido === 'Torneo') {
      const equipoOponenteExistente = await Team.findById(equipoOponente);
      if (!equipoOponenteExistente) {
        return res.status(400).json({ error: 'En torneos, el equipo oponente debe estar registrado en la plataforma' });
      }
    }

    // Crear y guardar el partido
    const match = new Match(req.body);
    await match.save();

    res.status(201).json({ message: 'Partido creado exitosamente', match });
  } catch (error) {
    console.error('Error al crear el partido:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el partido' });
  }
});

module.exports = router;

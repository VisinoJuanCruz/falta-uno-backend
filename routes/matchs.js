const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Team = require('../models/team');
const Match = require('../models/match'); // Asegúrate de que este modelo exista

// Agregar un partido
router.post('/:teamId/add-match', async (req, res) => {
  try {
    const { tipoPartido, equipo, equipoOponente, jugadoresEquipo, fecha, resultado } = req.body;
    console.log(req.body)

    // Verificar si el equipo existe
    const equipoExistente = await Team.findById(equipo);
    if (!equipoExistente) {
      return res.status(400).json({ error: 'El equipo registrado no existe' });
    }

    // Verificar que haya al menos 5 jugadores
    if (jugadoresEquipo.length < 5) {
      return res.status(400).json({ error: 'Debes seleccionar al menos 5 jugadores para tu equipo' });
    }

    // Lógica según el tipo de partido
    if (tipoPartido === 'Entrenamiento') {
      req.body.equipoOponente = equipo;
      req.body.resultado.oponente = equipoExistente.nombre;
      req.body.jugadoresOponente = jugadoresEquipo.map(j => ({ jugador: j.jugador, goles: j.goles })); // Cambié 'nombre' a 'jugador'
    } else if (tipoPartido === 'Amistoso') {
      if (equipoOponente) {
        const equipoOponenteExistente = await Team.findById(equipoOponente);
        if (equipoOponenteExistente) {
          req.body.resultado.oponente = equipoOponenteExistente.nombre;
        } else {
          return res.status(400).json({ error: 'El equipo oponente no existe en la plataforma' });
        }
      } else if (!resultado.oponente) {
        return res.status(400).json({ error: 'Debe proporcionar un nombre para el equipo oponente' });
      }
    } else if (tipoPartido === 'Torneo') {
      const equipoOponenteExistente = await Team.findById(equipoOponente);
      if (!equipoOponenteExistente) {
        return res.status(400).json({ error: 'En torneos, el equipo oponente debe estar registrado en la plataforma' });
      }
      req.body.resultado.oponente = equipoOponenteExistente.nombre;
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

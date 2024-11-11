const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Team = require('../models/team');
const Match = require('../models/match');
const mongoose = require('mongoose');

// Agregar un partido
router.post('/:teamId/add-match', async (req, res) => {
  console.log(req.body)
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
    let equipoOponenteExistente;
    if (tipoPartido === 'Entrenamiento') {
      req.body.equipoOponente = equipo;
      req.body.jugadoresOponente = jugadoresOponente.map(j => ({ jugador: j.jugador, goles: j.goles }));
    } else if (tipoPartido === 'Amistoso') {
      if (mongoose.Types.ObjectId.isValid(equipoOponente)) {
        equipoOponenteExistente = await Team.findById(equipoOponente);
        if (!equipoOponenteExistente) {
          return res.status(400).json({ error: 'El equipo oponente no existe en la plataforma' });
        }
      } else if (typeof equipoOponente === 'string' && equipoOponente.trim() === '') {
        return res.status(400).json({ error: 'Debe proporcionar un nombre para el equipo oponente en un partido amistoso no registrado' });
      }
    } else if (tipoPartido === 'Torneo') {
      equipoOponenteExistente = await Team.findById(equipoOponente);
      if (!equipoOponenteExistente) {
        return res.status(400).json({ error: 'En torneos, el equipo oponente debe estar registrado en la plataforma' });
      }
    }
    
    // Crear y guardar el partido
    const match = new Match(req.body);
    await match.save();
    console.log("SE GUARDA ESTO:",match)

    // Agregar el partido al equipo y, si aplica, al equipo oponente
    equipoExistente.matches.push(match._id);
    await equipoExistente.save();

    if (equipoOponenteExistente) {
      equipoOponenteExistente.matches.push(match._id);
      await equipoOponenteExistente.save();
    }

    // Actualizar estadísticas de los jugadores
    for (const jugadorData of jugadoresEquipo) {
      const player = await Player.findById(jugadorData.jugador);
      if (player) {
        player.goles += jugadorData.goles;
        player.partidosJugados += 1;
        if (resultado.golesEquipo > resultado.golesOponente) {
          player.partidosGanados += 1;
        } else if (resultado.golesEquipo < resultado.golesOponente) {
          player.partidosPerdidos += 1;
        } else {
          player.partidosEmpatados += 1;
        }
        await player.save();
      }
    }

    // Actualizar estadísticas de jugadores del equipo oponente, si está registrado
    if (equipoOponenteExistente) {
      for (const jugadorData of jugadoresOponente) {
        const player = await Player.findById(jugadorData.jugador);
        if (player) {
          player.goles += jugadorData.goles;
          player.partidosJugados += 1;
          if (resultado.golesEquipo < resultado.golesOponente) {
            player.partidosGanados += 1;
          } else if (resultado.golesEquipo > resultado.golesOponente) {
            player.partidosPerdidos += 1;
          } else {
            player.partidosEmpatados += 1;
          }
          await player.save();
        }
      }
    }

    res.status(201).json({ message: 'Partido creado exitosamente', match });
  } catch (error) {
    console.error('Error al crear el partido:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el partido' });
  }
});

// Obtener partidos de un equipo
router.get('/:teamId/matches', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verificar si el equipo existe
    const equipoExistente = await Team.findById(teamId);
    if (!equipoExistente) {
      return res.status(400).json({ error: 'El equipo no existe' });
    }

    // Obtener los partidos del equipo
    const partidos = await Match.find({
      $or: [{ equipo: teamId }, { equipoOponente: teamId }]
    })
      .populate('equipo', 'nombre escudo')
      .populate('equipoOponente', 'nombre escudo')
      .populate('jugadoresEquipo.jugador', 'name image') // Información de los jugadores del equipo
      .populate('jugadoresOponente.jugador', 'name image'); // Información de los jugadores del equipo oponente

    // Si no hay partidos, responder con un mensaje adecuado
    if (partidos.length === 0) {
      return res.status(404).json({ message: 'Este equipo no ha jugado ningún partido aún' });
    }

    res.status(200).json(partidos);
  } catch (error) {
    console.error('Error al obtener los partidos:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener los partidos' });
  }
});

module.exports = router;


module.exports = router;

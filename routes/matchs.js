const express = require('express');
const router = express.Router();
const Player = require('../models/player');
const Team = require('../models/team');
const Match = require('../models/match');
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
    }else if(jugadoresEquipo.length > 11){
      return res.status(400).json({ error: 'Debes seleccionar como mucho 11 jugadores para tu equipo' });
    }

    // Lógica según el tipo de partido
    let equipoOponenteExistente;
    console.log(tipoPartido === 'Entrenamiento')
    if (tipoPartido === 'Entrenamiento') {
      req.body.equipoOponente = equipo;
      req.body.jugadoresOponente = jugadoresOponente.map(j => ({ jugador: j.jugador, goles: j.goles }));
      equipoOponenteExistente = true
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

    // Agregar el partido al equipo y, si aplica, al equipo oponente
    equipoExistente.matches.push(match._id);
    await equipoExistente.save();

    if (equipoOponenteExistente && tipoPartido !== 'Entrenamiento') {
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
    console.log("SE METE?",equipoOponenteExistente)
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

router.get('/match/:matchId/', async (req, res) => {
  try {
    const { matchId } = req.params;
    const match = await Match.findById(matchId).populate('equipoOponente').populate('equipo')
    if (!match) return res.status(404).json({ message: 'Match no encontrado' });
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el match' });
  }
})

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

// Editar un partido con manejo de reemplazo de jugadores
router.put('/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { tipoPartido, equipo, equipoOponente, jugadoresEquipo, jugadoresOponente, fecha, resultado } = req.body;

    // Buscar el partido existente
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'El partido no existe' });
    }

    // Verificar si el equipo existe
    const equipoExistente = await Team.findById(equipo);
    if (!equipoExistente) {
      return res.status(400).json({ error: 'El equipo registrado no existe' });
    }

    let equipoOponenteExistente;
    if (tipoPartido === 'Entrenamiento') {
      req.body.equipoOponente = equipo;
      req.body.jugadoresOponente = jugadoresOponente.map(j => ({ jugador: j.jugador, goles: j.goles }));
    } else if (tipoPartido === 'Amistoso' || tipoPartido === 'Torneo') {
      equipoOponenteExistente = await Team.findById(equipoOponente);
      if (!equipoOponenteExistente && tipoPartido === 'Torneo') {
        return res.status(400).json({ error: 'El equipo oponente debe estar registrado en torneos' });
      }
    }

    // Actualizar estadísticas de jugadores que ya no están en la nueva lista (han sido reemplazados o eliminados)
    const jugadoresEquipoIdsPrevios = match.jugadoresEquipo.map(j => j.jugador.toString());
    const jugadoresEquipoIdsNuevos = jugadoresEquipo.map(j => j.jugador.toString());

    for (const jugadorData of match.jugadoresEquipo) {
      if (!jugadoresEquipoIdsNuevos.includes(jugadorData.jugador.toString())) {
        const player = await Player.findById(jugadorData.jugador);
        if (player) {
          player.goles -= jugadorData.goles;
          player.partidosJugados -= 1;
          if (match.resultado.golesEquipo > match.resultado.golesOponente) {
            player.partidosGanados -= 1;
          } else if (match.resultado.golesEquipo < match.resultado.golesOponente) {
            player.partidosPerdidos -= 1;
          } else {
            player.partidosEmpatados -= 1;
          }
          await player.save();
        }
      }
    }

    // Hacer lo mismo para los jugadores del equipo oponente
    const jugadoresOponenteIdsPrevios = match.jugadoresOponente.map(j => j.jugador.toString());
    const jugadoresOponenteIdsNuevos = jugadoresOponente.map(j => j.jugador.toString());

    for (const jugadorData of match.jugadoresOponente) {
      if (!jugadoresOponenteIdsNuevos.includes(jugadorData.jugador.toString())) {
        const player = await Player.findById(jugadorData.jugador);
        if (player) {
          player.goles -= jugadorData.goles;
          player.partidosJugados -= 1;
          if (match.resultado.golesEquipo < match.resultado.golesOponente) {
            player.partidosGanados -= 1;
          } else if (match.resultado.golesEquipo > match.resultado.golesOponente) {
            player.partidosPerdidos -= 1;
          } else {
            player.partidosEmpatados -= 1;
          }
          await player.save();
        }
      }
    }

    // Actualizar el partido con los nuevos datos
    match.tipoPartido = tipoPartido;
    match.equipo = equipo;
    match.equipoOponente = equipoOponente;
    match.jugadoresEquipo = jugadoresEquipo;
    match.jugadoresOponente = jugadoresOponente;
    match.fecha = fecha;
    match.resultado = resultado;
    await match.save();

    // Agregar estadísticas de los jugadores actuales en el partido
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

    // Hacer lo mismo para los jugadores actuales del equipo oponente, si está registrado
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

    res.status(200).json({ message: 'Partido actualizado exitosamente', match });
  } catch (error) {
    console.error('Error al editar el partido:', error);
    res.status(500).json({ error: 'Hubo un problema al editar el partido' });
  }
});


// Controlador para eliminar un partido
router.delete('/match/:matchId', async (req, res) => {
  const { matchId } = req.params; // Obtiene el ID del partido de los parámetros de la ruta

  try {
    // Encuentra el partido a eliminar
    const match = await Match.findById(matchId).populate('equipo').populate('jugadoresEquipo.jugador').populate('jugadoresOponente.jugador');
    if (!match) {
      return res.status(404).json({ message: 'Partido no encontrado' });
    }

    // Actualiza el equipo eliminando el partido de su lista de partidos
    const team = await Team.findById(match.equipo);
    if (team) {
      team.matches = team.matches.filter(id => id.toString() !== matchId);
      await team.save();
    }

    // Actualiza estadísticas de los jugadores de `jugadoresEquipo`
    for (const jugadorData of match.jugadoresEquipo) {
      const jugador = await Player.findById(jugadorData.jugador);
      if (jugador) {
        jugador.goles -= jugadorData.goles;
        jugador.partidosJugados -= 1;
        
        // Ajusta los partidos ganados, perdidos o empatados según el resultado del partido
        if (match.resultado.golesEquipo > match.resultado.golesOponente) {
          jugador.partidosGanados -= 1;
        } else if (match.resultado.golesEquipo < match.resultado.golesOponente) {
          jugador.partidosPerdidos -= 1;
        } else {
          jugador.partidosEmpatados -= 1;
        }
        
        await jugador.save();
      }
    }

    // Actualiza estadísticas de los jugadores de `jugadoresOponente`
    for (const jugadorData of match.jugadoresOponente) {
      const jugador = await Player.findById(jugadorData.jugador);
      if (jugador) {
        jugador.goles -= jugadorData.goles;
        jugador.partidosJugados -= 1;
        
        // Ajusta los partidos ganados, perdidos o empatados según el resultado del partido
        if (match.resultado.golesOponente > match.resultado.golesEquipo) {
          jugador.partidosGanados -= 1;
        } else if (match.resultado.golesOponente < match.resultado.golesEquipo) {
          jugador.partidosPerdidos -= 1;
        } else {
          jugador.partidosEmpatados -= 1;
        }
        
        await jugador.save();
      }
    }

    // Elimina el partido de la colección
    await Match.findByIdAndDelete(matchId);

    res.status(200).json({ message: 'Partido eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el partido' });
  }
});






module.exports = router;

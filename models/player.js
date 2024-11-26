const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  puntajeAtacando: { type: Number, required: true },
  puntajeDefendiendo: { type: Number, required: true },
  puntajeAtajando: { type: Number, required: true },
  equipo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  usuarioVinculado: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Usuario vinculado
  estadoVinculacion: { type: String, enum: ['pending', 'linked'], default: 'pending' }, // Estado del vínculo
  goles: { type: Number, default: 0 },             // Goles totales del jugador
  partidosJugados: { type: Number, default: 0 },   // Número de partidos jugados
  partidosGanados: { type: Number, default: 0 },   // Número de partidos ganados
  partidosPerdidos: { type: Number, default: 0 },  // Número de partidos perdidos
  partidosEmpatados: { type: Number, default: 0 }  // Número de partidos empatados
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;

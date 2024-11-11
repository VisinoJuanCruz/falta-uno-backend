const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  jugadores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // Referencia a la colección de jugadores
  escudo: { type: String, required: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Referencia al creador (usuario)
  localidad: { type: String, required: true },
  instagram: { type: String },
  nombre: { type: String, required: true },
  matches: [{type: mongoose.Schema.Types.ObjectId, ref: 'Match'}]
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;

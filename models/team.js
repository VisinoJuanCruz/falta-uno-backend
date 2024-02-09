const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  jugadores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // Referencia a la colección de jugadores
  escudo: { type: String, required: true },
  creador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Referencia al creador (usuario)
  localidad: { type: String, required: true },
  instagram: { type: String },
  nombre:{ type: String, required: true },
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;

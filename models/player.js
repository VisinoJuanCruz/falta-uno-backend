const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  puntajeAtacando: { type: Number, required: true },
  puntajeDefendiendo: { type: Number, required: true },
  puntajeAtajando: { type: Number, required: true },
  equipo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, 
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;

const mongoose = require('mongoose');

const canchaSchema = new mongoose.Schema({
  // Campos específicos de la cancha
  capacidadJugadores: { type: String, required: true }, // Puede ser "Fútbol 5", "Fútbol 7", etc.
  alAireLibre: { type: Boolean, default: true }, // Indica si la cancha es al aire libre o cerrada
  materialPiso: { type: String, required: true }, // Tipo de material del piso: césped, césped sintético, madera, concreto, etc.
  // Relación con el complejo deportivo al que pertenece esta cancha
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  precio: { type: Number, required: true }, // Precio de alquiler de la cancha
});

const Cancha = mongoose.model('Cancha', canchaSchema);

module.exports = Cancha;

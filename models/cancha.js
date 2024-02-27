const mongoose = require('mongoose');


const canchaSchema = new mongoose.Schema({
  capacidadJugadores: { type: String, required: true },
  alAireLibre: { type: Boolean, default: true },
  materialPiso: { type: String, required: true },
  complejoAlQuePertenece: { type: mongoose.Schema.Types.ObjectId, ref: 'Complejo' },
  precio: { type: Number, required: true },
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }] // Array to store reservations
});

const Cancha = mongoose.model('Cancha', canchaSchema);

module.exports = Cancha;

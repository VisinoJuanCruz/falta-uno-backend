// Archivo: ./backend/models/cancha.js
const mongoose = require('mongoose');

const canchaSchema = new mongoose.Schema({
  capacidadJugadores: { type: String, required: true },
  alAireLibre: { type: Boolean, default: true },
  materialPiso: { type: String, required: true },
  complejoAlQuePertenece: { type: mongoose.Schema.Types.ObjectId, ref: 'Complejo' },
  precio: { type: Number, required: true },
  horaDeSubida: { type: Number }, // Hora en formato 24 horas a partir de la cual sube el precio (e.g., 18 para las 18:00)
  precioDeSubida: { type: Number }, // Nuevo precio a partir de la horaDeSubida
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }], // Array to store reservations
  imagen: { type: String, required: true },
  nombre: { type: String, required: true },
});

const Cancha = mongoose.model('Cancha', canchaSchema);

module.exports = Cancha;

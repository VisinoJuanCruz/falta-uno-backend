//Archivo: ./backend/models/reserva.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reservaSchema = new mongoose.Schema({
  tipoReserva: { type: String, enum: ['partido', 'cumpleaños'], required: true },
  canchaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancha', required: false },
  complejoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complejo', required: false },
  horaInicio: { type: Date, required: true },
  horaFin: { type: Date, required: true },
  precio: { type: Number, required: true },
  reservante: { type: String, required: true },
  reservado: { type: Boolean, default: true },
});

reservaSchema.plugin(mongoosePaginate);
// Mantén la lógica actual de partidos
reservaSchema.pre('save', function(next) {
  if (this.tipoReserva === 'partido' && !this.horaFin) {
    const horaInicio = new Date(this.horaInicio);
    this.horaFin = new Date(horaInicio.getTime() + 3600000); // 1 hora para partidos
  }
  next();
});
const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;
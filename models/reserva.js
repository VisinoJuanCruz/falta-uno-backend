//Archivo: ./backend/models/reserva.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reservaSchema = new mongoose.Schema({
  horaInicio: { type: Date, required: true },
  horaFin: { type: Date, required: true },
  precio: { type: Number, required: true },
  reservado: { type: Boolean, default: true },
  canchaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancha' },
  reservante: { type: String, required: true },  // Nuevo campo para el nombre
});

reservaSchema.plugin(mongoosePaginate);

reservaSchema.pre('save', function(next) {
  if (!this.horaFin) {
    const horaInicio = new Date(this.horaInicio);
    this.horaFin = new Date(horaInicio.getTime() + 3600000); // Agregar una hora en milisegundos
  }
  next();
});

const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;

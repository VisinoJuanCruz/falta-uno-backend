const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reservaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  horaInicio: { type: Number, required: true },
  horaFin: { type: Number, required: true },
  precio: { type: Number, required: true },
  reservado: { type: Boolean, default: true },
  canchaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancha' },
});

reservaSchema.plugin(mongoosePaginate);

reservaSchema.pre('save', function(next) {
  if (!this.horaFin) {
    this.horaFin = this.horaInicio + 1;
  }
  next();
});

const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;

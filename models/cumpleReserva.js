const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const cumpleReservaSchema = new mongoose.Schema({
  complejoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complejo', required: true },
  reservante: { type: String, required: true },
  horaInicio: { type: Date, required: true },
  horaFin: { type: Date, required: true },
  precio: { type: Number, required: true },
  servicios: { type: [String], default: [] }, // Servicios opcionales como catering, decoración, etc.
  cantidadInvitados: { type: Number, required: true }, // Cantidad de invitados, si es relevante
  decoraciones: { type: [String], default: [] }, // Opciones de decoraciones específicas
});


cumpleReservaSchema.plugin(mongoosePaginate);
const CumpleReserva = mongoose.model('CumpleReserva', cumpleReservaSchema);


module.exports = CumpleReserva;

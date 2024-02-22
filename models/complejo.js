const mongoose = require('mongoose');

const complejoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  imagen: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String },
  whatsapp: { type: String },
  instagram: { type: String },
  userId :{type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Relación con las canchas del complejo
  canchas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancha' }]
});

const Complejo = mongoose.model('Complejo', complejoSchema);

module.exports = Complejo;

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  imagen: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String },
  whatsapp: { type: String },
  instagram: { type: String },
  // Relación con las canchas del complejo
  canchas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancha' }]
});

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;

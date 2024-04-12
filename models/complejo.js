// archivo: './backend/models/complejo.js
const mongoose = require('mongoose');

const complejoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  imagen: { type: String }, // Almacena la ruta del archivo de imagen en el sistema de archivos del servidor
  direccion: { type: String, required: true },
  telefono: { type: String },
  whatsapp: { type: String },
  instagram: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  canchas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancha' }]
});

const Complejo = mongoose.model('Complejo', complejoSchema);

module.exports = Complejo;

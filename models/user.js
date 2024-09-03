// Archivo: backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mail: { type: String, required: true },
  name: { type: String, required: true },
  equiposCreados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  whatsapp: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Usuario', 'Cliente', 'Superusuario'], default: 'Usuario' },
  complejos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complejo' }],
  isVerified: { type: Boolean, default: false }, // Nuevo campo para verificar si el email ha sido confirmado
  verificationToken: { type: String } // Nuevo campo para almacenar el token de verificación
});

const User = mongoose.model('User', userSchema);

module.exports = User;

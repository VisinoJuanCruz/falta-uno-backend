const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mail: { type: String, required: true },
  name: { type: String, required: true },
  equiposCreados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  whatsapp: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Usuario', 'Cliente', 'Superusuario'], default: 'Usuario' },
  complejos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complejo' }],
  isVerified: { type: Boolean, default: false }, // Campo para confirmar si el email ha sido verificado
  verificationToken: { type: String }, // Campo para almacenar el token de verificación
  habilitarWhatsapp: { type: Boolean, default: false } // Nuevo campo para permitir o no ser contactado por WhatsApp
});

const User = mongoose.model('User', userSchema);

module.exports = User;

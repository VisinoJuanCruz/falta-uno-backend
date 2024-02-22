const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mail: { type: String, required: true },
  name: { type: String, required: true },
  equiposCreados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  whatsapp: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Usuario', 'Cliente','Superuser'], default: 'Usuario' },
  complejos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complejo' }] // Referencia al modelo de complejo
});


const User = mongoose.model('User', userSchema);

module.exports = User;

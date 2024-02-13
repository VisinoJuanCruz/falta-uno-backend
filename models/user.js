const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mail: { type: String, required: true },
  name: { type: String, required: true },
  equiposCreados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }], // Referencia a la colección de equipos
  whatsapp: { type: String, required: true },
  password: { type: String, required: true },
  
});

const User = mongoose.model('User', userSchema);

module.exports = User;

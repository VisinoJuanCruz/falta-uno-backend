const mongoose = require('mongoose');

const canchaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, required: true }, // Ejemplo: "Futbol 5", "Futbol 11", etc.
  disponibilidad: [{
    dia: { type: String, required: true }, // Día de la semana (Lunes, Martes, etc.)
    horarios: [{ type: String }] // Horarios disponibles en formato HH:MM (ej. "10:00", "13:00")
  }]
});

const Cancha = mongoose.model('Cancha', canchaSchema);

module.exports = Cancha;

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  equipo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, // Equipo registrado que carga el partido

  // El equipo oponente puede ser un ObjectId (si está registrado en la plataforma) o un String (si no está registrado).
  equipoOponente: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },

  jugadoresEquipo: [
    {
      jugador: {
        type: mongoose.Schema.Types.Mixed, // Puede ser ObjectId (jugador registrado) o String (jugador no registrado)
        required: true
      },
      goles: { type: Number, default: 0 },
    }
  ],
  
  jugadoresOponente: [
    {
      jugador: {
        type: mongoose.Schema.Types.Mixed, // Puede ser ObjectId (jugador registrado) o String (jugador no registrado)
        required: true
      },
      goles: { type: Number, default: 0 }
    }
  ],
  
  fecha: { type: Date, default: Date.now },

  resultado: {
    golesEquipo: { type: Number, required: true },
    golesOponente: { type: Number, required: true }
  },

  tipoPartido: { type: String, enum: ['Amistoso', 'Torneo', 'Entrenamiento'], default: 'Entrenamiento' },
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;

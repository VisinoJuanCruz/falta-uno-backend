const express = require('express');
const Complejo = require('../models/complejo');
const Cancha = require('../models/cancha');

const router = express.Router();

// Obtener todas las canchas
router.get('/canchas', async (req, res) => {
  try {
    const canchas = await Cancha.find();
    res.json(canchas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obtener información de una cancha específica
router.get('/canchas/:canchaId', async (req, res) => {
  const { canchaId } = req.params;

  try {
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }
    res.json(cancha);
  } catch (error) {
    console.error('Error al obtener información de la cancha:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Crear una nueva cancha
router.post('/canchas', async (req, res) => {

  const complejoExists = await Complejo.findById(req.body.complejoAlQuePertenece);
  if (!complejoExists) {
    return res.status(400).json({ error: 'El complejo especificado no existe' });
  }


  const cancha = new Cancha({
    capacidadJugadores: req.body.capacidadJugadores,
    alAireLibre: req.body.alAireLibre,
    materialPiso: req.body.materialPiso,
    precio:req.body.precio,
    complejoAlQuePertenece: req.body.complejoAlQuePertenece,
    reservas:[],
    imagen: req.body.imagen,
    nombre: req.body.nombre
  });

  try {
    const savedCancha = await cancha.save();
    await Complejo.findByIdAndUpdate(req.body.complejoAlQuePertenece, { $push: { canchas: savedCancha._id } });
    res.status(201).json(savedCancha);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// En el archivo de rutas para las canchas
router.post('/canchas/:canchaId/reservar', async (req, res) => {
  const { canchaId } = req.params;
  const { horario, precio } = req.body; // Recibe el horario y el precio de la reserva

  try {
    // Encuentra la cancha por su ID
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    // Crea una nueva reserva
    const reserva = {
      horario,
      precio,
      fecha: new Date().toISOString(), // Puedes ajustar la fecha según tus necesidades
    };

    // Agrega la reserva a la lista de reservas de la cancha
    cancha.reservas.push(reserva);

    // Guarda los cambios en la base de datos
    await cancha.save();

    res.json({ message: 'Reserva realizada correctamente' });
  } catch (error) {
    console.error('Error al realizar la reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Complejo = require('../models/complejo');
const User = require('../models/user');
const Reserva = require('../models/reserva');


router.get('/complejos', async (req, res) => {
  try {
    const complejos = await Complejo.find().populate('canchas');
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/complejos-con-cancha-libre', async (req, res) => {
  
  try {
    const { fecha, hora } = req.query;
    console.log("FECHA AL BACK:", fecha)
    console.log("HORA AL BACK:", hora)

    // Busca todas las reservas en la fecha y hora especificadas
    const reservas = await Reserva.find({
      fecha: fecha,
      horaInicio: hora,
      reservado: true // Solo reservas que están marcadas como "reservado"
    });

    // Obtén los IDs de las canchas que están reservadas en la fecha y hora especificadas
    const canchasReservadas = reservas.map(reserva => reserva.canchaId);

    // Busca todas las canchas que no están en la lista de canchas reservadas
    // o aquellas reservas con fecha y hora pero con la propiedad reservado en false
    const canchasLibres = await Cancha.find({
      $or: [
        { _id: { $nin: canchasReservadas } }, // Excluye las canchas reservadas
        { $and: [{ _id: { $in: canchasReservadas } }, { 'reservas.reservado': false }] } // Incluye las canchas reservadas pero no reservadas
      ]
    });

    // Obtén los IDs de los complejos asociados a las canchas libres
    const complejosIds = canchasLibres.map(cancha => cancha.complejoAlQuePertenece);

    // Busca los complejos asociados a las canchas libres
    const complejos = await Complejo.find({
      _id: { $in: complejosIds } // Filtra por los IDs de los complejos
    });

    res.json(complejos); // Devuelve los complejos encontrados
  } catch (error) {
    console.error('Error al obtener los complejos con cancha libre:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Obtener un complejo por ID
router.get('/complejos/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }
    res.json(complejo);
  } catch (error) {
    console.error('Error al obtener complejo por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Crear un nuevo complejo
router.post('/complejos', async (req, res) => {
  try {
    const { nombre, imagen, direccion, telefono, whatsapp, instagram, userId } = req.body;
    
    const userExists = await User.findById(userId)
    if (!userExists) {
      return res.status(400).json({ error: 'El usuario especificado no existe' });
    }


    const nuevoComplejo = new Complejo({
      nombre,
      imagen,
      direccion,
      telefono,
      whatsapp,
      instagram,
      userId,
      canchas: [] // Inicialmente no hay canchas asociadas al complejo
    });

    
    console.log(nuevoComplejo)
    const savedComplejo = await nuevoComplejo.save();

    await User.findByIdAndUpdate(userId, { $push: { complejos: savedComplejo._id } });
    console.log('Complejo guardado:', savedComplejo);
    res.status(201).json(savedComplejo);
  } catch (error) {
    console.error('Error al agregar complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

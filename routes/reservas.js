//Archivo: ./backend/routes/reservas.js
const express = require('express');
const router = express.Router();
const Reserva = require('../models/reserva');
const Cancha = require('../models/cancha');

// Obtener todas las reservas
router.get('/reservas', async (req, res) => {
  try {
    const { fecha, canchaId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (fecha) {
      const fechaFiltro = new Date(fecha);
      const fechaInicio = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth(), fechaFiltro.getDate());
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 1);
      query.horaInicio = { $gte: fechaInicio, $lt: fechaFin };
    }
    if (canchaId) {
      query.canchaId = canchaId;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const reservas = await Reserva.paginate(query, options);
    await Reserva.populate(reservas.docs, { path: 'canchaId', select: 'nombre' });

    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener las reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});




// Crear una nueva reserva o cambiar el estado de una reserva existente
router.post('/reservas', async (req, res) => {
  const { canchaId,  precio } = req.body;
  const horaInicio = new Date(req.body.horaInicio);
if (isNaN(horaInicio.getTime())) {
  return res.status(400).json({ message: 'La hora de inicio proporcionada no es válida.' });
}

console.log(canchaId,horaInicio,precio)
    const horaFin = new Date(horaInicio.getTime() + 3600000)
    try {
      // Verificar si ya hay una reserva para este horario y esta cancha
      
      const existingReserva = await Reserva.findOne({
        canchaId,
        horaInicio
      });
      
      
    if (existingReserva) {
      
      // Si la reserva existe, cambiar su estado de reservado
      existingReserva.reservado = !existingReserva.reservado;
      existingReserva.precio = precio;
      const updatedReserva = await existingReserva.save();
      return res.status(200).json(updatedReserva);
    }
    
    
    // Si no existe una reserva, crear una nueva
    const reserva = new Reserva({
      canchaId,
      horaInicio,
      horaFin: new Date(horaInicio.getTime() + 3600000), // Sumar una hora en milisegundos
      precio,
      reservado: true // Marcar como reservado al crear una nueva reserva
    });
    
    const savedReserva = await reserva.save();
    await Cancha.findByIdAndUpdate(canchaId, { $push: { reservas: savedReserva._id } });
    res.status(201).json(savedReserva);
    
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Actualizar una reserva
router.put('/reservas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const reserva = await Reserva.findById(id).populate('canchaId', 'nombre');
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    reserva.reservado = !reserva.reservado;
    const updatedReserva = await reserva.save();

    res.json(updatedReserva);
    console.log("UPDATE RESERVA:", updatedReserva);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar una reserva
router.delete('/reservas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedReserva = await Reserva.findByIdAndRemove(id);
    if (!deletedReserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.json({ message: 'Reserva eliminada correctamente' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

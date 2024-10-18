const express = require('express');
const router = express.Router();
const Cumple = require('../models/cumpleReserva'); // Asumiendo que tienes un modelo de Cumple similar al de Reserva
const Complejo = require('../models/complejo')

// Obtener todos los cumpleaños de un complejo
router.get('/cumple/:complejoId', async (req, res) => {
  try {
    const { complejoId } = req.params;
    const { fecha, page = 1, limit = 50 } = req.query;
    const query = { }; // Filtrar por complejoId
    
    
    // Si hay un filtro de fecha, lo aplicamos similar a como hicimos con las reservas
    if (fecha) {
      const fechaFiltro = new Date(fecha);
      const fechaInicio = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth(), fechaFiltro.getDate());
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 1); // El filtro es para el día completo
      query.horaInicio = { $gte: fechaInicio, $lt: fechaFin };
    }
    
    if(complejoId) {
      query.complejoId = complejoId
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    // Obtenemos los cumpleaños con la paginación
    const cumpleanos = await Cumple.paginate(query, options);
    console.log(cumpleanos)
    res.json(cumpleanos);
  } catch (error) {
    console.error('Error al obtener los cumpleaños:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



// Crear una nueva reserva de cumple
router.post('/cumple', async (req, res) => {
  const { complejoId, precio, reservante, horaInicio, horaFin, servicios, cantidadInvitados, decoraciones } = req.body;

  console.log(horaInicio, horaFin); // Muestra las fechas recibidas

  
 // Usar directamente los valores de horaInicio y horaFin
 const inicio = new Date(horaInicio);
 const fin = new Date(horaFin);
 console.log('NODE_ENV:', process.env.NODE_ENV);
 // Restar 3 horas solo si estamos en desarrollo
 if (process.env.NODE_ENV === 'development') {
   inicio.setHours(inicio.getHours() - 3);
   fin.setHours(fin.getHours() - 3);
 }
  console.log(inicio, fin); // Muestra las fechas convertidas

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return res.status(400).json({ message: 'Las horas proporcionadas no son válidas.' });
  }

  try {
    // Verificar si ya hay una reserva de cumple para el mismo horario y complejo
    const existingReserva = await Cumple.findOne({
      complejoId,
      horaInicio: { $lt: fin }, // Chequear si el inicio de la nueva reserva se solapa con una existente
      horaFin: { $gt: inicio }, // Chequear si el fin de la nueva reserva se solapa con una existente
    });

    if (existingReserva) {
      return res.status(400).json({ message: 'Ya existe una reserva para este horario.' });
    }

    const nuevaReserva = new Cumple({
      complejoId,
      horaInicio: inicio, // Almacena la fecha ajustada
      horaFin: fin, // Almacena la fecha ajustada
      precio,
      reservante,
      servicios,
      cantidadInvitados,
      decoraciones,
    });

    const savedReserva = await nuevaReserva.save();
    await Complejo.findByIdAndUpdate(complejoId, { $push: { reservas: savedReserva._id } });
    return res.status(201).json(savedReserva);
  } catch (err) {
    console.error('Error al crear la reserva de cumple:', err);
    res.status(400).json({ message: err.message });
  }
});

// Actualizar una reserva de cumple
router.put('/cumple/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const reserva = await Cumple.findById(id);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Actualiza los campos según sea necesario
    Object.assign(reserva, req.body);
    const updatedReserva = await reserva.save();

    res.json(updatedReserva);
    console.log("UPDATE RESERVA cumple:", updatedReserva);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar una reserva de cumple
router.delete('/cumple/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedReserva = await Cumple.findByIdAndRemove(id);
    if (!deletedReserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.json({ message: 'Reserva de cumple eliminada correctamente' });
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

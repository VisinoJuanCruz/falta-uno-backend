const express = require('express');
const router = express.Router();
const CumpleReserva = require('../models/cumpleReserva'); // Asegúrate de que este sea el nombre correcto de tu modelo
const Complejo = require('../models/complejo'); // Modelo para complejos si es necesario
const moment = require('moment-timezone');
// Obtener todas las reservas de cumple por complejoId
router.get('/cumple/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    const cumpleañosReservas = await CumpleReserva.find({ complejoId });
    res.json(cumpleañosReservas);
  } catch (error) {
    console.error('Error al obtener las reservas de cumple:', error);
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

  // Restar 3 horas (3 horas * 60 minutos * 60 segundos * 1000 milisegundos)
  inicio.setHours(inicio.getHours() - 3);
  fin.setHours(fin.getHours() - 3);

  console.log(inicio, fin); // Muestra las fechas convertidas

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return res.status(400).json({ message: 'Las horas proporcionadas no son válidas.' });
  }

  try {
    // Verificar si ya hay una reserva de cumple para el mismo horario y complejo
    const existingReserva = await CumpleReserva.findOne({
      complejoId,
      horaInicio: { $lt: fin }, // Chequear si el inicio de la nueva reserva se solapa con una existente
      horaFin: { $gt: inicio }, // Chequear si el fin de la nueva reserva se solapa con una existente
    });

    if (existingReserva) {
      return res.status(400).json({ message: 'Ya existe una reserva para este horario.' });
    }

    const nuevaReserva = new CumpleReserva({
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
    const reserva = await CumpleReserva.findById(id);
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
    const deletedReserva = await CumpleReserva.findByIdAndRemove(id);
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

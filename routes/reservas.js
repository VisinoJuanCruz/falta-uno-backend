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





router.post('/reservas', async (req, res) => {
  const { canchaId, complejoId, precio, reservante, horaInicio, horaFin, cancelacion, tipoReserva } = req.body;
  console.log(cancelacion)
  const inicio = new Date(horaInicio);
    // Esto debería mostrar la función del modelo si está bien importado

  if (isNaN(inicio.getTime())) {
    return res.status(400).json({ message: 'La hora de inicio proporcionada no es válida.' });
  }
   

  try {
    let existingReserva;

    if (tipoReserva === 'partido') {
      // Verificar si ya hay una reserva para este horario y esta cancha (solo para partidos)
      existingReserva = await Reserva.findOne({
        canchaId,
        horaInicio: inicio
      });
    } else if (tipoReserva === 'cumpleaños') {
      // Verificar si ya hay una reserva para este horario y este complejo (solo para cumpleaños)
      existingReserva = await Reserva.findOne({
        complejoId,
        horaInicio: inicio
      });
    }

    if (existingReserva) {
      // Si es una cancelación
      if (cancelacion) {
        existingReserva.reservado = false;  // Marcar como no reservado
        const updatedReserva = await existingReserva.save();
        return res.status(200).json(updatedReserva);
      }

      // Si no es cancelación, actualizar precio y reservante
      existingReserva.precio = precio;
      existingReserva.reservante = reservante;
      existingReserva.reservado = true;
      const updatedReserva = await existingReserva.save();
      return res.status(200).json(updatedReserva);
    }

    // Crear una nueva reserva si no existe una reserva en ese horario

    let nuevaReserva;

    if (tipoReserva === 'partido') {
      nuevaReserva = new Reserva({
        tipoReserva,
        canchaId,
        horaInicio: inicio,
        horaFin: new Date(inicio.getTime() + 3600000), // Sumar una hora en milisegundos para los partidos
        precio,
        reservante,
        reservado: true,
      });

      const savedReserva = await nuevaReserva.save();
      await Cancha.findByIdAndUpdate(canchaId, { $push: { reservas: savedReserva._id } });
      return res.status(201).json(savedReserva);
      
    } else if (tipoReserva === 'cumpleaños') {
      nuevaReserva = new Reserva({
        tipoReserva,
        complejoId,
        horaInicio: inicio,
        horaFin: new Date(horaFin),  // Definir la duración según la selección del usuario
        precio,
        reservante,
        reservado: true,
      });

      const savedReserva = await nuevaReserva.save();
      await Complejo.findByIdAndUpdate(complejoId, { $push: { reservas: savedReserva._id } });
      return res.status(201).json(savedReserva);
    }

    // En caso de que el tipo de reserva no sea válido
    return res.status(400).json({ message: 'Tipo de reserva no válido.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/complejoId')


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

const express = require('express');
const router = express.Router();
const CumpleReserva = require('../models/cumpleReserva'); // Asumiendo que tienes un modelo de CumpleReserva similar al de Reserva
const Complejo = require('../models/complejo')
const Reserva = require('../models/reserva')



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
    const cumpleanos = await CumpleReserva.paginate(query, options);
    
    res.json(cumpleanos);
  } catch (error) {
    console.error('Error al obtener los cumpleaños:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/cumple-by-id/:cumpleId', async (req, res) => {
  console.log("BIENVENIDO AL BACKEND"); // Esto debería ejecutarse si la ruta es alcanzada
  const { cumpleId } = req.params;

  try {
    const cumple = await CumpleReserva.findById(cumpleId); // Verifica que esto esté utilizando el ID correcto

    if (!cumple) {
      return res.status(404).json({ error: 'cumple no encontrado' });
    }
    
    res.json(cumple); // Devuelve solo el objeto de CumpleReserva
  } catch (error) {
    console.error('Error al obtener cumple por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener cumple por ID' });
  }
});

// Crear una nueva reserva de cumple
router.post('/cumple', async (req, res) => {
  const { complejoId, precio, reservante, horaInicio, horaFin, servicios, cantidadInvitados, decoraciones, fecha } = req.body;

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
    // Verificar si ya hay una reserva de cumple o cancha en conflicto con el mismo horario
    const conflictingReservations = await Reserva.find({
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cancha
      ]
    });

    const conflictingCumpleReservas = await CumpleReserva.find({
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cumpleaños
      ]
    });

    if (conflictingReservations.length > 0 || conflictingCumpleReservas.length > 0) {
      return res.status(400).json({
        message: 'Ya existe una reserva en el rango de tiempo seleccionado.'
      });
    }

    // Crear la nueva reserva si no hay conflictos
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
    res.status(500).json({ message: 'Error al crear la reserva. Inténtalo de nuevo.' });
  }
});

// Actualizar una reserva de cumple
router.put('/cumple/:id', async (req, res) => {
  const { id } = req.params;
  const { horaInicio, horaFin, fecha } = req.body;

  try {
    const reserva = await CumpleReserva.findById(id);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Si se van a cambiar la horaInicio o la horaFin, verifica los conflictos
    if (horaInicio && horaFin && fecha) {
      const inicio = new Date(horaInicio);
      const fin = new Date(horaFin);

      // Restar 3 horas solo si estamos en desarrollo
      if (process.env.NODE_ENV === 'development') {
        inicio.setHours(inicio.getHours() - 3);
        fin.setHours(fin.getHours() - 3);
      }

      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ message: 'Las horas proporcionadas no son válidas.' });
      }

      // Verificar conflictos con otras reservas de cancha o cumpleaños en el mismo rango de tiempo
      const conflictingCanchaReservations = await CanchaReserva.find({
        fecha: fecha,
        _id: { $ne: id }, // Excluir la reserva actual
        $or: [
          { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cancha
        ]
      });

      const conflictingCumpleReservas = await CumpleReserva.find({
        fecha: fecha,
        _id: { $ne: id }, // Excluir la reserva actual
        $or: [
          { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con otra reserva de cumpleaños
        ]
      });

      if (conflictingCanchaReservations.length > 0 || conflictingCumpleReservas.length > 0) {
        return res.status(400).json({
          message: 'Ya existe una reserva en el rango de tiempo seleccionado.'
        });
      }

      // Si no hay conflictos, actualiza los horarios de la reserva
      reserva.horaInicio = inicio;
      reserva.horaFin = fin;
    }

    // Actualiza los demás campos si están en el body
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

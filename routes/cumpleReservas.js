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
    // Verificar si ya hay una reserva de cancha en el mismo complejo deportivo con el mismo horario
    const conflictingReservations = await Reserva.find({
      complejoId: complejoId, // Filtrar por el complejo correspondiente
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cancha
      ]
    });

    // Verificar si ya hay una reserva de cumpleaños en el mismo complejo deportivo con el mismo horario
    const conflictingCumpleReservas = await CumpleReserva.find({
      complejoId: complejoId, // Filtrar por el complejo correspondiente
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cumpleaños
      ]
    });

    // Verificar si hay conflictos con las reservas existentes
    if (conflictingReservations.length > 0 || conflictingCumpleReservas.length > 0) {
      return res.status(400).json({
        message: 'Ya existe una reserva en el rango de tiempo seleccionado en este complejo.'
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

// Editar una reserva de cumple existente
router.put('/cumple/:cumpleId', async (req, res) => {
  const { cumpleId } = req.params;
  const { complejoId, precio, reservante, horaInicio, horaFin, servicios, cantidadInvitados, decoraciones, fecha } = req.body;

  // Convertir las fechas a objetos Date
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

  try {
    // Verificar si la reserva de cumpleaños existe
    const cumpleReserva = await CumpleReserva.findById(cumpleId);
    if (!cumpleReserva) {
      return res.status(404).json({ message: 'Reserva de cumpleaños no encontrada.' });
    }

    // Verificar si hay otras reservas de canchas o cumpleaños en conflicto dentro del mismo complejo
    const conflictingReservations = await Reserva.find({
      complejoId: cumpleReserva.complejoId, // Verificar solo en el mismo complejo
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con una reserva de cancha
      ],
      _id: { $ne: cumpleId } // Excluir la reserva que estamos editando
    });

    const conflictingCumpleReservas = await CumpleReserva.find({
      complejoId: cumpleReserva.complejoId, // Verificar solo en el mismo complejo
      fecha: fecha,
      $or: [
        { horaInicio: { $lt: fin }, horaFin: { $gt: inicio } } // Si el horario se solapa con otra reserva de cumpleaños
      ],
      _id: { $ne: cumpleId } // Excluir la reserva que estamos editando
    });

    if (conflictingReservations.length > 0 || conflictingCumpleReservas.length > 0) {
      return res.status(400).json({
        message: 'Ya existe una reserva en el rango de tiempo seleccionado para este complejo.'
      });
    }

    // Actualizar los datos de la reserva
    cumpleReserva.complejoId = complejoId;
    cumpleReserva.horaInicio = inicio;
    cumpleReserva.horaFin = fin;
    cumpleReserva.precio = precio;
    cumpleReserva.reservante = reservante;
    cumpleReserva.servicios = servicios;
    cumpleReserva.cantidadInvitados = cantidadInvitados;
    cumpleReserva.decoraciones = decoraciones;

    // Guardar los cambios
    const updatedCumple = await cumpleReserva.save();
    return res.status(200).json(updatedCumple);

  } catch (err) {
    console.error('Error al editar la reserva de cumple:', err);
    res.status(500).json({ message: 'Error al editar la reserva. Inténtalo de nuevo.' });
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

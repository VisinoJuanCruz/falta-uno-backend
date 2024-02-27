// Obtener todas las reservas
const express = require('express');
const router = express.Router();
const Reserva = require('../models/reserva');

router.get('/reservas', async (req, res) => {
  try {
    const { fecha, canchaId, page = 1, limit = 10 } = req.query;
    const query = {};

    // Agregar parámetros de filtrado si están presentes
    if (fecha) {
      // Convertir la fecha proporcionada en un objeto Date
      const fechaFiltro = new Date(fecha);
      
      // Definir el rango de fechas para la consulta
      const fechaInicio = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth(), fechaFiltro.getDate());
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 1);

      // Agregar la condición de filtrado para que esté entre la fecha de inicio y fin del día
      query.fecha = { $gte: fechaInicio, $lt: fechaFin };
    }
    if (canchaId) {
      query.canchaId = canchaId;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    // Consultar la base de datos con los parámetros proporcionados
    const reservas = await Reserva.paginate(query, options);
    console.log(reservas);
    // Enviar los resultados paginados al cliente
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener las reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



// Crear una nueva reserva
router.post('/reservas', async (req, res) => {
  const reserva = new Reserva({
    canchaId: req.body.canchaId,
    fecha: req.body.fecha,
    horaInicio: req.body.horaInicio,
    horaFin: req.body.horaFin,
    precio: req.body.precio,
    canchaId:req.body.canchaId,
  });

  
  try {
    const savedReserva = await reserva.save();
    res.status(201).json(savedReserva);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Actualizar una reserva
router.put('/reservas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const reserva = await Reserva.findByIdAndUpdate(id, req.body, { new: true });
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.json(reserva);
  } catch (err) {
    res.status(400).json({ message: err.message });
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

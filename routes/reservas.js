const express = require('express');
const router = express.Router();
const Reserva = require('../models/reserva');
const Cancha = require('../models/cancha');

// Obtener todas las reservas
router.get('/reservas', async (req, res) => {
  try {
    const { fecha, canchaId, page = 1, limit = 50 } = req.query;
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
      query.horaInicio = { $gte: fechaInicio, $lt: fechaFin };
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
    // Enviar los resultados paginados al cliente
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
    console.log("LA HORA DE FIN QUEDA:", horaFin)
  try {
    // Verificar si ya hay una reserva para este horario y esta cancha
    
    const existingReserva = await Reserva.findOne({
      canchaId,
      horaInicio
    });
    
    
    if (existingReserva) {
      
      // Si la reserva existe, cambiar su estado de reservado
      existingReserva.reservado = !existingReserva.reservado;
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
    console.log(reserva)
    
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
    // Encontrar la reserva por ID
    const reserva = await Reserva.findById(id);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Actualizar el estado de 'reservado' a su valor opuesto
    reserva.reservado = !reserva.reservado;
    const updatedReserva = await reserva.save();

    // Devolver la reserva actualizada como respuesta
    res.json(updatedReserva);
    console.log("UPDATE RESERVA:", updatedReserva)
  } catch (err) {
    // Manejar errores
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

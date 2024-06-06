// archivo: ./backend/routes/complejos.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Complejo = require('../models/complejo');
const Reserva = require('../models/reserva');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// Configurar Multer para manejar la carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './images/complejos');
  },
  filename: function (req, file, cb) {
    const filenameWithoutExtension = path.basename(file.originalname, path.extname(file.originalname));
    const newFilename = `${filenameWithoutExtension}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, newFilename);
  }
});

const upload = multer({ storage });

// Verificar si el valor es un ObjectId válido
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.post('/complejos', upload.single('complejoImagen'), async (req, res) => {
  try {
    const formData = req.body;
    const imagen = req.file.path;

    if (!imagen) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const nuevoComplejo = new Complejo({
      nombre: formData.nombre,
      imagen: imagen,
      direccion: formData.direccion,
      telefono: formData.telefono,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      userId: formData.userId,
      servicios: formData.servicios,
      descripcion: formData.descripcion,
      canchas: []
    });

    const savedComplejo = await nuevoComplejo.save();
    await User.findByIdAndUpdate(formData.userId, { $push: { complejos: savedComplejo._id } });
    res.status(201).json(savedComplejo);
  } catch (error) {
    console.error('Error al agregar complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/complejos', async (req, res) => {
  try {
    const complejos = await Complejo.find().populate('canchas');
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Obtener un complejo por ID
router.get('/complejos/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    if (!isValidObjectId(complejoId)) {
      return res.status(400).json({ message: 'ID de complejo inválido' });
    }

    const complejo = await Complejo.findById(complejoId).populate('canchas');
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }
    res.json(complejo);
  } catch (error) {
    console.error('Error al obtener complejo por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/complejos/:complejoId', upload.single('complejoImagen'), async (req, res) => {
  const { complejoId } = req.params;
  const formData = req.body;

  try {
    if (!isValidObjectId(complejoId)) {
      return res.status(400).json({ message: 'ID de complejo inválido' });
    }

    let updateFields = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      telefono: formData.telefono,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      userId: formData.userId,
      servicios: formData.servicios,
      descripcion: formData.descripcion,
    };

    if (req.file) {
      updateFields.imagen = req.file.path;
    }

    const complejo = await Complejo.findByIdAndUpdate(complejoId, updateFields, { new: true });

    if (!complejo) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }

    res.json(complejo);
  } catch (error) {
    console.error('Error al editar complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor al editar complejo' });
  }
});

router.get('/complejos/:complejoId/stats', async (req, res) => {
  const { complejoId } = req.params;

  try {
    if (!isValidObjectId(complejoId)) {
      return res.status(400).json({ message: 'ID de complejo inválido' });
    }

    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }

    // Obtener las reservas de todas las canchas del complejo donde reservado sea true, ordenadas por horaInicio
    const reservas = await Reserva.find({ canchaId: { $in: complejo.canchas }, reservado: true }).sort({ horaInicio: 1 }).populate('canchaId', 'nombre');
    
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener estadísticas del complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint para obtener reservas filtradas por fechas
router.get('/complejos/:complejoId/reservas', async (req, res) => {
  const { complejoId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    if (!isValidObjectId(complejoId)) {
      return res.status(400).json({ message: 'ID de complejo inválido' });
    }

    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }

    let query = { canchaId: { $in: complejo.canchas }, reservado: true };
    if (startDate && endDate) {
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setUTCHours(23, 59, 59, 999); // Ajustar el endDate para incluir todo el día
      query.horaInicio = { $gte: new Date(startDate), $lte: endDateWithTime };
    }

    // Obtener las reservas que cumplen con los criterios de filtrado, ordenadas por horaInicio
    const reservas = await Reserva.find(query).sort({ horaInicio: 1 }).populate('canchaId', 'nombre');

    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas del complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.post('/complejos/buscar', async (req, res) => {
  const { fecha } = req.body;
  
  try {
    const complejosConCanchaLibre = await buscarComplejosConCanchaLibre(fecha);
    res.json(complejosConCanchaLibre);
  } catch (error) {
    console.error('Error al buscar complejos con canchas libres:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para buscar complejos con canchas libres
const buscarComplejosConCanchaLibre = async (fecha) => {
  try {
    const fechaUTC = new Date(fecha);
    const complejos = await Complejo.find().populate('canchas');
    const complejosConCanchaLibre = [];

    for (const complejo of complejos) {
      let tieneCanchaLibre = false;

      for (const cancha of complejo.canchas) {
        const reservas = await Reserva.find({
          canchaId: cancha._id,
          horaInicio: fechaUTC,
        });

        if (reservas.length === 0 || reservas.some(reserva => !reserva.reservado)) {
          tieneCanchaLibre = true;
          break;
        }
      }

      if (tieneCanchaLibre) {
        complejosConCanchaLibre.push(complejo);
      }
    }

    return complejosConCanchaLibre;
  } catch (error) {
    console.error('Error al buscar complejos con canchas libres:', error);
    throw new Error('Error al buscar complejos con canchas libres. Por favor, intenta de nuevo más tarde.');
  }
};



module.exports = router;


// archivo: ./backend/routes/complejos.js
const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authenticate');
const authorizeUserForComplejo = require('../middlewares/authorize');
const Complejo = require('../models/complejo');
const Reserva = require('../models/reserva');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/user');

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

    // Convertir el campo servicios de JSON string a array si es necesario
    const servicios = typeof formData.servicios === 'string' ? JSON.parse(formData.servicios) : formData.servicios;

    const nuevoComplejo = new Complejo({
      nombre: formData.nombre,
      imagen: imagen,
      direccion: formData.direccion,
      telefono: formData.telefono,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      userId: formData.userId,
      servicios: servicios,
      descripcion: formData.descripcion,
      canchas: []
    });

    const savedComplejo = await nuevoComplejo.save();
    await User.findByIdAndUpdate(formData.userId, { $push: { complejos: savedComplejo._id } });
    res.status(201).json(savedComplejo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar el complejo' });
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
    
    console.log("Complejo a enviar:", complejo); // Agrega esto para depurar
    res.json(complejo);
  } catch (error) {
    console.error('Error al obtener complejo por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/complejos/:id', upload.single('complejoImagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;
    const imagen = req.file ? req.file.path : null;

    // Obtener el complejo actual desde la base de datos
    const complejoActual = await Complejo.findById(id);
    if (!complejoActual) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }

    // Asegúrate de que si hay una imagen nueva, se actualice
    const servicios = typeof formData.servicios === 'string' ? JSON.parse(formData.servicios) : formData.servicios;

    // Combina los datos existentes con los nuevos datos
    const updateData = {
      nombre: formData.nombre || complejoActual.nombre,
      direccion: formData.direccion || complejoActual.direccion,
      telefono: formData.telefono || complejoActual.telefono,
      whatsapp: formData.whatsapp || complejoActual.whatsapp,
      instagram: formData.instagram || complejoActual.instagram,
      descripcion: formData.descripcion || complejoActual.descripcion,
      servicios: servicios.length > 0 ? servicios : complejoActual.servicios, // Actualiza solo si hay nuevos servicios
    };

    // Si se subió una nueva imagen, añade la propiedad
    if (imagen) {
      updateData.imagen = imagen;
    }

    const updatedComplejo = await Complejo.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedComplejo);
  } catch (error) {
    console.error('Error al actualizar el complejo:', error);
    res.status(500).json({ error: 'Error al actualizar el complejo' });
  }
});





// Aplicar los middlewares de autenticación y autorización
router.get('/complejos/:complejoId/stats', authenticateUser, authorizeUserForComplejo, async (req, res) => {
  const { complejoId } = req.params;

  try {
    if (!isValidObjectId(complejoId)) {
      return res.status(400).json({ message: 'ID de complejo inválido' });
    }

    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }

    const reservas = await Reserva.find({ canchaId: { $in: complejo.canchas }, reservado: true }).sort({ horaInicio: 1 }).populate('canchaId', 'nombre');
    
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener estadísticas del complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/complejos/:complejoId/reservas', authenticateUser, authorizeUserForComplejo, async (req, res) => {
  const { complejoId } = req.params;
  const { startDate, endDate, canchaIds } = req.query;

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
      endDateWithTime.setUTCHours(23, 59, 59, 999);
      query.horaInicio = { $gte: new Date(startDate), $lte: endDateWithTime };
    }

    if (canchaIds) {
      query.canchaId.$in = canchaIds.split(',');
    }

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


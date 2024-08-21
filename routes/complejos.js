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
const cloudinary = require('cloudinary').v2; // Importar Cloudinary

const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'complejos',
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif']
  },
});

const upload = multer({ storage });

// Verificar si el valor es un ObjectId válido
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Crear un nuevo complejo
router.post('/complejos', upload.single('complejoImagen'), async (req, res) => {
  try {
    const formData = req.body;
    let imagePublicId;

    if (req.file) {
      imagePublicId = req.file.filename; // Usar el public_id de la imagen subida
    } else {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Convertir el campo servicios de JSON string a array si es necesario
    const servicios = typeof formData.servicios === 'string' ? JSON.parse(formData.servicios) : formData.servicios;

    const nuevoComplejo = new Complejo({
      nombre: formData.nombre,
      imagen: imagePublicId, // Guardar el public_id de la imagen en Cloudinary
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
    console.error('Error al guardar el complejo:', error);
    res.status(500).json({ error: 'Error al guardar el complejo' });
  }
});


// Obtener todos los complejos
router.get('/complejos', async (req, res) => {
  try {
    const complejos = await Complejo.find().populate('canchas');
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Obtener un complejo por su ID
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

// Actualizar un complejo por su ID
router.put('/complejos/:id', upload.single('complejoImagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;

    // Obtener el complejo actual desde la base de datos
    const complejoActual = await Complejo.findById(id);
    if (!complejoActual) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }

    let updateData = {
      nombre: formData.nombre || complejoActual.nombre,
      direccion: formData.direccion || complejoActual.direccion,
      telefono: formData.telefono || complejoActual.telefono,
      whatsapp: formData.whatsapp || complejoActual.whatsapp,
      instagram: formData.instagram || complejoActual.instagram,
      descripcion: formData.descripcion || complejoActual.descripcion,
    };

    // Convertir el campo servicios de JSON string a array si es necesario
    const servicios = typeof formData.servicios === 'string' ? JSON.parse(formData.servicios) : formData.servicios;
    updateData.servicios = servicios.length > 0 ? servicios : complejoActual.servicios;

    // Si se subió una nueva imagen, manejar la eliminación de la imagen anterior y la subida de la nueva imagen
    if (req.file) {
      if (complejoActual.imagen) {
        await cloudinary.uploader.destroy(complejoActual.imagen); // Eliminar la imagen antigua usando el public_id
      }

      updateData.imagen = req.file.filename; // Actualizar con el nuevo public_id
    }

    // Actualizar el complejo con los nuevos datos
    const updatedComplejo = await Complejo.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json(updatedComplejo);
  } catch (error) {
    console.error('Error al actualizar el complejo:', error);
    res.status(500).json({ error: 'Error al actualizar el complejo' });
  }
});


// Eliminar un complejo por su ID
router.delete('/complejos/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    const complejo = await Complejo.findById(complejoId);
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }

    // Eliminar la imagen de Cloudinary
    if (complejo.imagen) {
      await cloudinary.uploader.destroy(complejo.imagen);
    }

    await Complejo.findByIdAndDelete(complejoId);
    await User.updateOne(
      { complejos: complejoId },
      { $pull: { complejos: complejoId } }
    );

    res.json({ message: 'Complejo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar el complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas del complejo
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

// Obtener reservas de un complejo
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

    if (canchaIds && Array.isArray(canchaIds)) {
      query.canchaId = { $in: canchaIds };
    }

    const reservas = await Reserva.find(query).sort({ horaInicio: 1 }).populate('canchaId', 'nombre');
    
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas del complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Buscar complejos con canchas disponibles
router.post('/complejos/buscar', async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const complejos = await buscarComplejosConCanchaLibre(startDate, endDate);
    res.json(complejos);
  } catch (error) {
    console.error('Error al buscar complejos:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function buscarComplejosConCanchaLibre(startDate, endDate) {
  try {
    const complejosConDisponibilidad = await Complejo.aggregate([
      {
        $lookup: {
          from: 'reservas',
          localField: 'canchas',
          foreignField: 'canchaId',
          as: 'reservas'
        }
      },
      {
        $match: {
          'reservas.horaInicio': { $gte: new Date(startDate), $lte: new Date(endDate) },
          'reservas.reservado': false
        }
      },
      {
        $project: {
          nombre: 1,
          direccion: 1,
          reservas: 1
        }
      }
    ]);

    return complejosConDisponibilidad;
  } catch (error) {
    console.error('Error en buscarComplejosConCanchaLibre:', error);
    throw new Error('Error al buscar complejos con canchas libres');
  }
}

module.exports = router;

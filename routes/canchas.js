// routes/canchas.js
const express = require('express');
const Complejo = require('../models/complejo');
const Cancha = require('../models/cancha');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar Cloudinary usando las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar Multer para usar Cloudinary como almacenamiento
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'canchas', // Carpeta en Cloudinary donde se guardarán las imágenes
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

const upload = multer({ storage });

// Obtener todas las canchas
router.get('/canchas', async (req, res) => {
  try {
    const canchas = await Cancha.find();
    res.json(canchas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obtener información de una cancha específica
router.get('/canchas/:canchaId', async (req, res) => {
  const { canchaId } = req.params;

  try {
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }
    res.json(cancha);
  } catch (error) {
    console.error('Error al obtener información de la cancha:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear una nueva cancha
router.post('/canchas', upload.single('canchaImagen'), async (req, res) => {
  try {
    const complejoExists = await Complejo.findById(req.body.complejoAlQuePertenece);
    if (!complejoExists) {
      return res.status(400).json({ error: 'El complejo especificado no existe' });
    }

    const formData = req.body;
    const imagenUrl = req.file ? req.file.path : undefined;

    const cancha = new Cancha({
      capacidadJugadores: formData.capacidadJugadores,
      alAireLibre: formData.alAireLibre,
      materialPiso: formData.materialPiso,
      precio: formData.precio,
      complejoAlQuePertenece: formData.complejoAlQuePertenece,
      reservas: [],
      imagen: imagenUrl, // Guardar la URL de la imagen
      nombre: formData.nombre,
    });

    const savedCancha = await cancha.save();
    await Complejo.findByIdAndUpdate(req.body.complejoAlQuePertenece, { $push: { canchas: savedCancha._id } });
    res.status(201).json(savedCancha);
  } catch (err) {
    console.error('Error al guardar la cancha:', err);
    res.status(400).json({ message: err.message });
  }
});

// Editar una cancha por su ID
router.put('/canchas/:canchaId', upload.single('canchaImagen'), async (req, res) => {
  const { canchaId } = req.params;
  const formData = req.body;

  try {
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    const updateFields = {
      nombre: formData.nombre,
      capacidadJugadores: formData.capacidadJugadores,
      alAireLibre: formData.alAireLibre,
      materialPiso: formData.materialPiso,
      precio: formData.precio,
    };

    if (req.file) {
      // Eliminar la imagen anterior de Cloudinary
      const publicId = cancha.imagen.split('/').pop().split('.')[0]; // Obtener el public_id de la imagen
      await cloudinary.uploader.destroy(publicId);

      // Usar el nuevo public_id de la imagen
      updateFields.imagen = req.file.path;
    }

    const updatedCancha = await Cancha.findByIdAndUpdate(canchaId, updateFields, { new: true });
    res.json(updatedCancha);
  } catch (err) {
    console.error('Error al actualizar la cancha:', err);
    res.status(400).json({ message: err.message });
  }
});

// Eliminar una cancha específica
router.delete('/canchas/:canchaId', async (req, res) => {
  const { canchaId } = req.params;

  try {
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    // Eliminar la imagen de Cloudinary
    if (cancha.imagen) {
      const publicId = cancha.imagen.split('/').pop().split('.')[0]; // Obtener el public_id de la imagen
      await cloudinary.uploader.destroy(publicId);
    }

    await Cancha.findByIdAndDelete(canchaId);
    await Complejo.updateOne(
      { canchas: canchaId },
      { $pull: { canchas: canchaId } }
    );

    res.json({ message: 'Cancha eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar la cancha:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// En el archivo de rutas para las canchas
router.post('/canchas/:canchaId/reservar', async (req, res) => {
  const { canchaId } = req.params;
  const { horario, precio } = req.body;

  try {
    const cancha = await Cancha.findById(canchaId);
    if (!cancha) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    const reserva = {
      horario,
      precio,
      fecha: new Date().toISOString(),
    };

    cancha.reservas.push(reserva);
    await cancha.save();

    res.json({ message: 'Reserva realizada correctamente' });
  } catch (error) {
    console.error('Error al realizar la reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

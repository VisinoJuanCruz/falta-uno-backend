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
    const formData = req.body;

    let imagePublicId;
    if (req.file) {
      imagePublicId = req.file.filename; // Usar el filename de la imagen subida
    } else {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const nuevoCancha = new Cancha({
      nombre: formData.nombre,
      tipo: formData.tipo,
      precio: formData.precio,
      imagen: imagePublicId, // Guardar el public_id de la imagen
      complejo: formData.complejoId,
    });

    const savedCancha = await nuevoCancha.save();

    await Complejo.findByIdAndUpdate(formData.complejoId, { $push: { canchas: savedCancha._id } });

    res.status(201).json(savedCancha);
  } catch (error) {
    console.error('Error al crear cancha:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear cancha' });
  }
});

// Actualizar una cancha por su ID
router.put('/canchas/:id', upload.single('canchaImagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const formData = req.body;

    // Obtener la cancha actual desde la base de datos
    const canchaActual = await Cancha.findById(id);
    if (!canchaActual) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    let updateData = {
      nombre: formData.nombre || canchaActual.nombre,
      tipo: formData.tipo || canchaActual.tipo,
      precio: formData.precio || canchaActual.precio,
    };

    // Si se subió una nueva imagen, manejar la eliminación de la imagen anterior y la subida de la nueva imagen
    if (req.file) {
      if (canchaActual.imagen) {
        await cloudinary.uploader.destroy(canchaActual.imagen); // Eliminar la imagen antigua usando el public_id
      }

      updateData.imagen = req.file.filename; // Actualizar con el nuevo public_id
    }

    // Actualizar la cancha con los nuevos datos
    const updatedCancha = await Cancha.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json(updatedCancha);
  } catch (error) {
    console.error('Error al actualizar cancha:', error);
    res.status(500).json({ error: 'Error al actualizar cancha' });
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

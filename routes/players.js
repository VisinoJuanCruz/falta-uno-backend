// routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');
const multer = require('multer'); // Importar multer
const path = require('path'); // Importar el módulo 'path'
const sharp = require('sharp'); // Importar sharp para redimensionar imágenes
const fs = require('fs');
const cloudinary = require('cloudinary').v2; // Importar Cloudinary
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // Importar CloudinaryStorage

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar Multer para usar Cloudinary como almacenamiento
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'players', // Carpeta en Cloudinary donde se guardarán las imágenes
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 200, height: 200, crop: 'limit' }], // Redimensionar las imágenes
  },
});

const upload = multer({ storage: storage });

// Middleware para redimensionar la imagen antes de almacenarla en Cloudinary (opcional)
const resizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Aquí ya no necesitas redimensionar manualmente la imagen, ya que Cloudinary lo hace automáticamente
    next();
  } catch (error) {
    console.error('Error al redimensionar la imagen:', error);
    return res.status(500).json({ error: 'Error interno del servidor al redimensionar la imagen' });
  }
};

const router = express.Router();

// Obtener todos los jugadores con paginación
router.get('/players', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Página solicitada (predeterminada: 1)
  const limit = parseInt(req.query.limit) || 16; // Tamaño de la página (predeterminado: 10)

  try {
    const count = await Player.countDocuments();
    const totalPages = Math.ceil(count / limit);
    const skip = (page - 1) * limit;

    const players = await Player.find()
      .populate('equipo')
      .skip(skip)
      .limit(limit);

    res.json({
      totalPlayers: count,
      totalPages,
      currentPage: page,
      players
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/players', upload.single('playerImage'), async (req, res) => {
  try {
    const formData = req.body;

    // Verificar si se proporcionó una imagen
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Verificar si el equipo existe
    const teamExists = await Team.findById(formData.equipoId);
    if (!teamExists) {
      return res.status(400).json({ error: 'El equipo especificado no existe' });
    }

    // Crear el nuevo jugador con el ID del equipo asociado y el public_id de la imagen
    const newPlayer = new Player({
      name: formData.name,
      image: result.public_id, // Guardar el public_id en lugar de la ruta
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
      creadoPor: formData.creadoPor,
      equipo: formData.equipoId // Establecer el ID del equipo
    });

    const savedPlayer = await newPlayer.save();

    // Actualizar el equipo para incluir el ID del nuevo jugador en el array 'jugadores'
    await Team.findByIdAndUpdate(formData.equipoId, { $push: { jugadores: savedPlayer._id } });

    res.status(201).json(savedPlayer);
  } catch (error) {
    console.error('Error al agregar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar jugador' });
  }
});


// Obtener un jugador por su ID
router.get('/players/:playerId', async (req, res) => {
  const { playerId } = req.params;

  try {
    const player = await Player.findById(playerId).populate('equipo');

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json(player);
  } catch (error) {
    console.error('Error al obtener jugador por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener jugador por ID' });
  }
});

router.put('/players/:playerId', upload.single('playerImage'), async (req, res) => {
  const { playerId } = req.params;
  const formData = req.body;

  try {
    const currentPlayer = await Player.findById(playerId);

    if (!currentPlayer) {
      return res.status(404).json({ error: 'Player no encontrado' });
    }

    let updateFields = {
      name: formData.name,
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
    };

    if (req.file) {
      // Eliminar la imagen anterior de Cloudinary
      await cloudinary.uploader.destroy(currentPlayer.image);

      // Usar el public_id de la imagen subida por multer
      updateFields.image = req.file.filename;  // 'filename' contiene el public_id de Cloudinary
    }

    const player = await Player.findByIdAndUpdate(playerId, updateFields, { new: true });

    if (!player) {
      return res.status(404).json({ error: 'Player no encontrado' });
    }

    res.json(player);
  } catch (error) {
    console.error('Error al editar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al editar jugador' });
  }
});




// Obtener todos los jugadores de un equipo por su teamId
router.get('/players/by-team/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    // Verificar si el equipo existe
    const teamExists = await Team.findById(teamId);
    if (!teamExists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Buscar todos los jugadores que pertenecen al equipo con el ID proporcionado
    const players = await Player.find({ equipo: teamId });

    res.json(players);
  } catch (error) {
    console.error('Error al obtener jugadores por teamId:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener jugadores por teamId' });
  }
});

router.delete('/players/:playerId', async (req, res) => {
  const { playerId } = req.params;

  try {
    // Buscar al jugador por su ID
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Eliminar la imagen de Cloudinary
    await cloudinary.uploader.destroy(player.image);

    // Eliminar al jugador de la base de datos
    await Player.findByIdAndDelete(playerId);

    // Eliminar al jugador de la lista de jugadores del equipo
    await Team.findByIdAndUpdate(player.equipo, { $pull: { jugadores: playerId } });

    res.json({ message: 'Jugador eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar jugador' });
  }
});

module.exports = router;

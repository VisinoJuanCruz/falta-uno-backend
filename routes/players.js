// archivo: ./backend/routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');

const path = require('path'); // Importar el módulo 'path'
const sharp = require('sharp'); // Importar sharp para redimensionar imágenes
const fs = require('fs');
const upload = require('../config/cloudinary');



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

// routes/players.js

// Ruta para agregar un jugador
router.post('/players', upload.single('playerImage'), async (req, res) => {
  try {
    const formData = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const teamExists = await Team.findById(formData.equipoId);
    if (!teamExists) {
      return res.status(400).json({ error: 'El equipo especificado no existe' });
    }

    const newPlayer = new Player({
      name: formData.name,
      image: req.file.path, // Utiliza el path de la imagen ya subida por multer
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
      creadoPor: formData.creadoPor,
      equipo: formData.equipoId
    });

    const savedPlayer = await newPlayer.save();
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
    // Buscar el jugador actual en la base de datos
    const currentPlayer = await Player.findById(playerId);

    if (!currentPlayer) {
      return res.status(404).json({ error: 'Player no encontrado' });
    }

    // Actualizar campos básicos del jugador
    let updateFields = {
      name: formData.name,
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
    };

    // Verificar si se subió una nueva imagen
    if (req.file) {
      // Eliminar la imagen anterior de Cloudinary si existe
      if (currentPlayer.image) {
        await cloudinary.uploader.destroy(currentPlayer.image);
      }

      // Subir la nueva imagen a Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      // Actualizar el campo de imagen con el public_id de la nueva imagen
      updateFields.image = result.public_id;
    }

    // Actualizar el jugador en la base de datos con los nuevos campos
    const player = await Player.findByIdAndUpdate(playerId, updateFields, { new: true });

    if (!player) {
      return res.status(404).json({ error: 'Player no encontrado' });
    }

    // Devolver el jugador actualizado
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

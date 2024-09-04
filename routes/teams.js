//Archivo: ./backend/routes/teams.js
const express = require('express');
const Team = require('../models/team');
const Player = require('../models/player');
const User = require('../models/user');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

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
    folder: 'teams', // Carpeta en Cloudinary donde se guardarán las imágenes
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

const upload = multer({ storage });

const router = express.Router();

// Obtener todos los equipos
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un equipo por ID
router.get('/teams/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear un nuevo equipo
router.post('/teams', upload.single('escudo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });

    const newTeam = new Team({
      jugadores: req.body.jugadores,
      nombre: req.body.nombre,
      escudo: req.file.filename, // Usar el public_id de Cloudinary que se encuentra en req.file.filename
      localidad: req.body.localidad,
      instagram: req.body.instagram,
      creadoPor: req.body.creadoPor,
    });

    const savedTeam = await newTeam.save();
    await User.findByIdAndUpdate(req.body.creadoPor, { $push: { equiposCreados: savedTeam._id } });
    res.status(201).json(savedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al crear equipo' });
  }
});

// Actualizar un equipo
router.put('/teams/:teamId', upload.single('escudo'), async (req, res) => {
  try {
    const currentTeam = await Team.findById(req.params.teamId);
    if (!currentTeam) return res.status(404).json({ error: 'Equipo no encontrado' });

    const updateFields = {
      nombre: req.body.nombre,
      localidad: req.body.localidad,
      instagram: req.body.instagram,
    };

    if (req.file) {
      // Eliminar la imagen anterior de Cloudinary
      await cloudinary.uploader.destroy(currentTeam.escudo);

      // Usar el public_id de la nueva imagen
      updateFields.escudo = req.file.filename;
    }

    const updatedTeam = await Team.findByIdAndUpdate(req.params.teamId, updateFields, { new: true });
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al editar equipo' });
  }
});


// Obtener los equipos de un usuario específico
router.get('/teams/user/:userId', async (req, res) => {
  try {
    const teams = await Team.find({ creadoPor: req.params.userId });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al obtener equipos del usuario' });
  }
});

// Eliminar un equipo y sus jugadores asociados
router.delete('/teams/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Eliminar la imagen del equipo (team.escudo) de Cloudinary
    if (team.escudo) {
      await cloudinary.uploader.destroy(team.escudo);
    }

    // Eliminar todos los jugadores asociados al equipo eliminado
    const players = await Player.find({ equipo: req.params.teamId });

    for (const player of players) {
      // Solo eliminar la imagen del jugador de Cloudinary si no es una imagen predefinida
      if (player.image && !player.image.startsWith('players/predefined_')) {
        await cloudinary.uploader.destroy(player.image);
      }

      // Eliminar el jugador de la base de datos
      await Player.findByIdAndDelete(player._id);
    }

    // Eliminar el equipo de la base de datos
    await Team.findByIdAndDelete(req.params.teamId);

    // Quitar el equipo de la lista de equipos creados por el usuario
    await User.updateOne({ _id: team.creadoPor }, { $pull: { equiposCreados: req.params.teamId } });

    res.status(200).json({ message: 'Equipo y jugadores eliminados exitosamente' });
  } catch (error) {
    console.error('Error al eliminar equipo y jugadores:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar equipo' });
  }
});


module.exports = router;

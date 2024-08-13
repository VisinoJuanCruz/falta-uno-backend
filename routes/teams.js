const express = require('express');
const passport = require('passport');
const Team = require('../models/team');
const Player = require('../models/player');
const User = require('../models/user');
const multer = require('multer'); 
const { CloudinaryStorage } = require('multer-storage-cloudinary'); 
const cloudinary = require('cloudinary').v2; 

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
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Obtener un equipo por ID
router.get('/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team no encontrado' });
    }
    res.json(team);
  } catch (error) {
    console.error('Error al obtener team por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Crear un nuevo equipo
router.post('/teams', upload.single('escudo'), async (req, res) => {
  try {
    const formData = req.body;

    // Verificar si se proporcionó una imagen
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    const newTeam = new Team({
      jugadores: formData.jugadores,
      nombre: formData.nombre,
      escudo: result.public_id, // Guardar el public_id en lugar de la ruta
      localidad: formData.localidad,
      instagram: formData.instagram,
      creadoPor: formData.creadoPor,
    });

    const savedTeam = await newTeam.save();
    await User.findByIdAndUpdate(formData.creadoPor, { $push: { equiposCreados: savedTeam._id } });
    res.status(201).json(savedTeam);
  } catch (error) {
    console.error('Error al crear equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear equipo' });
  }
});

// Actualizar un equipo
router.put('/teams/:teamId', upload.single('escudo'), async (req, res) => {
  const { teamId } = req.params;
  const formData = req.body;

  try {
    const currentTeam = await Team.findById(teamId);

    if (!currentTeam) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    let updateFields = {
      nombre: formData.nombre,
      localidad: formData.localidad,
      instagram: formData.instagram,
    };

    // Verificar si se envió una nueva imagen
    if (req.file) {
      // Eliminar la imagen anterior de Cloudinary
      await cloudinary.uploader.destroy(currentTeam.escudo);

      // Subir la nueva imagen a Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      // Usar el public_id de la nueva imagen
      updateFields.escudo = result.public_id;
    }

    const team = await Team.findByIdAndUpdate(teamId, updateFields, { new: true });

    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error al editar equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al editar equipo' });
  }
});

// Agregar un jugador a un equipo
router.post('/teams/:id/add-player', async (req, res) => {
  try {
    const teamId = req.params.id;
    const playerId = req.body.playerId; 

    // Verifica si el equipo existe
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Verifica si el jugador existe
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Agrega el ID del jugador al array de jugadores del equipo
    team.jugadores.push(playerId);
    await team.save();

    res.status(200).json({ message: 'Jugador agregado exitosamente al equipo' });
  } catch (error) {
    console.error('Error al agregar jugador al equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar jugador al equipo' });
  }
});

// Obtener los equipos de un usuario específico
router.get('/teams/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const teams = await Team.find({ creadoPor: userId });
    res.json(teams);
  } catch (error) {
    console.error('Error al obtener equipos del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener equipos del usuario' });
  }
});

// Eliminar un equipo y sus jugadores asociados
router.delete('/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    // Busca el equipo por su ID
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    // Eliminar la imagen de Cloudinary
    await cloudinary.uploader.destroy(team.escudo);

    // Eliminar el equipo de la base de datos
    await Team.findByIdAndDelete(teamId);

    // Eliminar todos los jugadores asociados al equipo eliminado
    await Player.deleteMany({ equipo: teamId });

    // Quitar el equipo de la lista de equipos creados del usuario que lo creó
    await User.updateOne({ _id: team.creadoPor }, { $pull: { equiposCreados: teamId } });

    res.status(200).json({ message: 'Equipo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar equipo:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar equipo' });
  }
});

module.exports = router;

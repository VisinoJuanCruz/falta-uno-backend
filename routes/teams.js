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
    folder: 'teams',
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

const upload = multer({ storage });

const router = express.Router();

// Obtener todos los equipos, priorizando los creados por el usuario loggeado si se proporciona el userId
router.get('/teams', async (req, res) => {
  const { userId } = req.query; // Obtenemos el userId de los parámetros de consulta

  try {
    let teams;
    if (userId) {
      // Si hay un usuario loggeado, primero obtenemos los equipos creados por ese usuario
      const userTeams = await Team.find({ creadoPor: userId }); // Equipos creados por el usuario
      const otherTeams = await Team.find({ creadoPor: { $ne: userId } }); // Equipos creados por otros usuarios

      // Concatenamos los equipos del usuario con los otros equipos
      teams = [...userTeams, ...otherTeams];
    } else {
      // Si no hay usuario loggeado, obtenemos todos los equipos sin filtrar
      teams = await Team.find();
    }

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
    let imagePublicId;

    // Verifica si se seleccionó una imagen predefinida
    if (req.body.selectedImage) {
      imagePublicId = req.body.selectedImage; // Usar el public_id de la imagen predefinida
    } else if (req.file) {
      imagePublicId = req.file.filename; // Usar el filename de la imagen subida
    } else {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const newTeam = new Team({
      jugadores: req.body.jugadores,
      nombre: req.body.nombre,
      escudo: imagePublicId, // Guardar el public_id seleccionado o subido
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

    let updateFields = {
      nombre: req.body.nombre,
      localidad: req.body.localidad,
      instagram: req.body.instagram,
    };

    // Verificar si se seleccionó una imagen predefinida
    if (req.body.selectedImage) {
      // No eliminar la imagen anterior si es predefinida
      if (currentTeam.escudo && !currentTeam.escudo.startsWith('teams/predefined_')) {
        await cloudinary.uploader.destroy(currentTeam.escudo); // Eliminar la imagen de Cloudinary
      }
      updateFields.escudo = req.body.selectedImage;
    } else if (req.file) {
      // Eliminar la imagen anterior si no es predefinida y se sube una nueva imagen
      if (currentTeam.escudo && !currentTeam.escudo.startsWith('teams/predefined_')) {
        await cloudinary.uploader.destroy(currentTeam.escudo); // Eliminar la imagen de Cloudinary
      }
      updateFields.escudo = req.file.filename; // Actualizar con el nuevo public_id de la imagen subida
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
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });

    // Eliminar la imagen del equipo si no es predefinida
    if (team.escudo && !team.escudo.startsWith('teams/predefined_')) {
      await cloudinary.uploader.destroy(team.escudo);
    }

    // Eliminar todos los jugadores asociados al equipo eliminado
    const players = await Player.find({ equipo: req.params.teamId });
    for (const player of players) {
      // Solo eliminar la imagen del jugador de Cloudinary si no es predefinida
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
    res.status(500).json({ error: 'Error interno del servidor al eliminar equipo' });
  }
});

module.exports = router;

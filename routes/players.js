// routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');
const multer = require('multer'); // Importar multer
const path = require('path'); // Importar el módulo 'path'
const sharp = require('sharp'); // Importar sharp para redimensionar imágenes

// Configurar Multer para manejar la carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './images/players');
  },
  filename: function (req, file, cb) {
    const filenameWithoutExtension = path.basename(file.originalname, path.extname(file.originalname));
    const newFilename = `${filenameWithoutExtension}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, newFilename);
  }
});

const upload = multer({ storage });

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
    const imagenPath = req.file.path;

    console.log("DATOS:", formData);
    console.log("IMAGEN:", imagenPath);

    if (!imagenPath) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Redimensionar la imagen a 100x100
    const resizedImageBuffer = await sharp(imagenPath)
      .resize({ width: 100, height: 100 })
      .toBuffer();

    const resizedImagePath = path.join(__dirname, '..', 'images', 'players', `${formData.name}-${Date.now()}-resized.jpg`);
    await sharp(resizedImageBuffer).toFile(resizedImagePath);

    // Usar la ruta de la imagen redimensionada
    const resizedImageRelativePath = path.relative(path.join(__dirname, '..'), resizedImagePath);

    // Verificar si el equipo existe
    const teamExists = await Team.findById(formData.equipoId);
    if (!teamExists) {
      return res.status(400).json({ error: 'El equipo especificado no existe' });
    }

    // Crear el nuevo jugador con el ID del equipo asociado
    const newPlayer = new Player({
      name: formData.name,
      image: resizedImageRelativePath,
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

// Editar un jugador por su ID
// Editar un jugador por su ID
router.put('/players/:playerId', upload.single('playerImage'), async (req, res) => {
  const { playerId } = req.params;
  const formData = req.body;

  try {
    let updateFields = {
      name: formData.name,
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
    };

    if (req.file) {
      // Si hay un archivo adjunto, redimensiona la imagen
      const resizedImageBuffer = await sharp(req.file.path)
        .resize({ width: 100, height: 100 })
        .toBuffer();

      const resizedImagePath = path.join(__dirname, '..', 'images', 'players', `${formData.name}-${Date.now()}-resized.jpg`);
      await sharp(resizedImageBuffer).toFile(resizedImagePath);

      // Usar la ruta de la imagen redimensionada
      updateFields.image = path.relative(path.join(__dirname, '..'), resizedImagePath);
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

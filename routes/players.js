// routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');
const multer = require('multer'); // Importar multer
const path = require('path'); // Importar el módulo 'path'
const sharp = require('sharp'); // Importar sharp para redimensionar imágenes
const fs = require('fs');


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



const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Verificar el tipo de archivo, por ejemplo, solo permitir imágenes
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  }
});


// Middleware para redimensionar la imagen antes de almacenarla
const resizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Redimensionar la imagen a 100x100
    const resizedImageBuffer = await sharp(req.file.path)
      .resize({ width: 100, height: 100 })
      .toBuffer();

    // Sobrescribir el archivo original con la imagen redimensionada
    fs.writeFileSync(req.file.path, resizedImageBuffer);

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


router.post('/players', upload.single('playerImage'), resizeImage, async (req, res) => {
  try {
    const formData = req.body;

    // Verificar si se proporcionó una imagen
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Usar la ruta de la imagen redimensionada
    const resizedImageRelativePath = path.relative(path.join(__dirname, '..'), req.file.path);

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


router.put('/players/:playerId', upload.single('playerImage'), resizeImage, async (req, res) => {
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
      // Obtener la ubicación del archivo
      const filePath = req.file.path;
      
      // Obtener el jugador actual para obtener la imagen anterior y eliminarla
     // Obtener el jugador actual para obtener la imagen anterior y eliminarla
     const currentPlayer = await Player.findById(playerId);
if (currentPlayer && currentPlayer.image) {
  // Construir la ruta de la imagen a eliminar
  const imagePathToDelete = path.join(__dirname, '..', currentPlayer.image);
  console.log("RUTA PARA ELIMINAR", imagePathToDelete);

  // Verificar si el archivo existe antes de intentar eliminarlo
  if (fs.existsSync(imagePathToDelete)) {
    // Eliminar la imagen anterior del servidor
    fs.unlinkSync(imagePathToDelete);
    console.log("Imagen anterior eliminada correctamente");
  } else {
    console.log("La imagen anterior no existe en la ruta especificada");
  }
}

      // Redimensionar la imagen y guardar la nueva imagen
      const resizedImagePath = path.join(__dirname, '..', 'images', 'players', `${formData.name}-${Date.now()}-resized.jpg`);
      await sharp(filePath)
        .resize({ width: 100, height: 100 })
        .toFile(resizedImagePath);

      // Usar la ruta de la imagen redimensionada
      updateFields.image = path.relative(path.join(__dirname, '..'), resizedImagePath);

      // Eliminar el archivo original
      fs.unlinkSync(filePath);
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

// Resto del código para la creación de un nuevo jugador

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

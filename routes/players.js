//Archivo: ./backend/routes/players.js
const express = require('express');
const Player = require('../models/player');
const Team = require('../models/team');
const User = require('../models/user')
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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
    folder: 'players',
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 200, height: 200, crop: 'limit' }],
  },
});

const upload = multer({ storage: storage });

const router = express.Router();

// Obtener todos los jugadores con paginación

router.get('/players', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 32;
  const userId = req.query.userId; // Obtener el userId de la query string

  const skip = (page - 1) * limit;

  try {
    let query = {};
    let players = [];
    let totalPlayers = 0;

    if (userId) {
      // Si hay un userId, buscamos los equipos creados por este usuario
      const teams = await Team.find({ creadoPor: userId }).select('_id');
      const teamIds = teams.map(team => team._id);

      // Filtramos jugadores cuyos equipos están en los equipos creados por el usuario
      const userPlayers = await Player.find({ equipo: { $in: teamIds } })
        .populate('equipo') // Relacionar con el equipo
        .limit(limit)
        .skip(skip);

      const nonUserPlayers = await Player.find({ equipo: { $nin: teamIds } })
        .populate('equipo') // Relacionar con el equipo
        .limit(limit - userPlayers.length) // Limitar a la cantidad restante
        .skip(skip);

      players = [...userPlayers, ...nonUserPlayers]; // Priorizar los jugadores del usuario
      totalPlayers = await Player.countDocuments(); // Contar el total de jugadores
    } else {
      // Si no hay un userId, obtenemos todos los jugadores en su orden original
      totalPlayers = await Player.countDocuments();
      players = await Player.find(query)
        .populate('equipo') // Relacionar con el equipo
        .skip(skip)
        .limit(limit);
    }

    const totalPages = Math.ceil(totalPlayers / limit);

    res.json({
      totalPlayers,
      totalPages,
      currentPage: page,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/players/user', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 32;
  const userId = req.query.userId; // Obtener el userId de la query string

  const skip = (page - 1) * limit;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere un userId.' });
  }

  try {
    // Buscamos los equipos creados por este usuario
    const teams = await Team.find({ creadoPor: userId }).select('_id');
    const teamIds = teams.map(team => team._id);

    // Filtramos los jugadores cuyos equipos están en los equipos creados por el usuario
    const players = await Player.find({ equipo: { $in: teamIds } })
      .populate('equipo') // Relacionar con el equipo
      .limit(limit)
      .skip(skip);

    const totalPlayers = await Player.countDocuments({ equipo: { $in: teamIds } });
    const totalPages = Math.ceil(totalPlayers / limit);

    res.json({
      totalPlayers,
      totalPages,
      currentPage: page,
      players,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


router.post('/players', upload.single('playerImage'), async (req, res) => {
  try {
    const formData = req.body;
    let imagePublicId;

    // Verifica si se seleccionó una imagen predeterminada
    if (formData.selectedImage) {
      imagePublicId = formData.selectedImage; // Usar el public_id de la imagen predeterminada
    } else if (req.file) {
      imagePublicId = req.file.filename; // Usar el filename de la imagen subida
    } else {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const teamExists = await Team.findById(formData.equipoId);
    if (!teamExists) {
      return res.status(400).json({ error: 'El equipo especificado no existe' });
    }

    const newPlayer = new Player({
      name: formData.name,
      image: imagePublicId, // Guardar el public_id seleccionado o subido
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
      creadoPor: formData.creadoPor,
      equipo: formData.equipoId,
    });

    const savedPlayer = await newPlayer.save();

    await Team.findByIdAndUpdate(formData.equipoId, { $push: { jugadores: savedPlayer._id } });

    res.status(201).json(savedPlayer);
  } catch (error) {
    console.error('Error al agregar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al agregar jugador' });
  }
});


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
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    let updateFields = {
      name: formData.name,
      puntajeAtacando: formData.puntajeAtacando,
      puntajeDefendiendo: formData.puntajeDefendiendo,
      puntajeAtajando: formData.puntajeAtajando,
    };

    // Verificar si la imagen actual no es predefinida antes de eliminarla
    if (!currentPlayer.image.startsWith('players/predefined_')) {
      await cloudinary.uploader.destroy(currentPlayer.image); // Eliminar la imagen antigua de Cloudinary
    }

    // Actualizar con la nueva imagen
    if (formData.selectedImage) {
      updateFields.image = formData.selectedImage; // Usar la imagen predefinida
    } else if (req.file) {
      updateFields.image = req.file.filename; // Usar la nueva imagen subida
    }

    // Actualizar el jugador con los nuevos datos
    const updatedPlayer = await Player.findByIdAndUpdate(playerId, updateFields, { new: true });

    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Jugador no encontrado después de la actualización' });
    }

    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error al editar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al editar jugador' });
  }
});

router.get('/players/by-team/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    const teamExists = await Team.findById(teamId);
    if (!teamExists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const players = await Player.find({ equipo: teamId });

    res.json(players);
  } catch (error) {
    console.error('Error al obtener jugadores por teamId:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener jugadores por teamId' });
  }
});

router.get('/players/by-team/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    const teamExists = await Team.findById(teamId);
    if (!teamExists) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const players = await Player.find({ equipo: teamId });

    res.json(players);
  } catch (error) {
    console.error('Error al obtener jugadores por teamId:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener jugadores por teamId' });
  }
});

// Ejemplo en el backend con Mongoose y MongoDB
router.post('/players/involucrados', async (req, res) => {
 
  const { playerIds } = req.body; // IDs de jugadores involucrados
  
  try {
    const players = await Player.find({ _id: { $in: playerIds } });
    
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los jugadores' });
  }
});


router.delete('/players/:playerId', async (req, res) => {
  const { playerId } = req.params;

  try {
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Solo eliminar la imagen si no es una imagen predefinida
    if (!player.image.startsWith('players/predefined_')) {
      await cloudinary.uploader.destroy(player.image); // Eliminar la imagen de Cloudinary
    }

    await Player.findByIdAndDelete(playerId);
    await Team.findByIdAndUpdate(player.equipo, { $pull: { jugadores: playerId } });

    res.json({ message: 'Jugador eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar jugador:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar jugador' });
  }
});

router.post('/players/:playerId/request-link', async (req, res) => {
  const { requesterId } = req.body; // Usuario solicitante
  const { playerId } = req.params;

  try {
    // Verificar que el jugador existe
    const player = await Player.findById(playerId).populate('equipo');
    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado.' });
    }

    // Verificar que el usuario solicitante existe
    const user = await User.findById(requesterId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario solicitante no encontrado.' });
    }

    // Verificar que el jugador no está ya vinculado
    if (player.usuarioVinculado) {
      return res.status(400).json({ message: 'Este jugador ya está vinculado a otro usuario.' });
    }

    // Obtener al propietario del equipo
    const owner = await User.findById(player.equipo.creadoPor);
    if (!owner) {
      return res.status(404).json({ message: 'Propietario del equipo no encontrado.' });
    }

    // Verificar que no exista una solicitud pendiente para este jugador y usuario
    const solicitudExistente = owner.solicitudesVinculacion.some(
      (solicitud) => solicitud.playerId.toString() === playerId && solicitud.requesterId.toString() === requesterId
    );

    if (solicitudExistente) {
      return res.status(400).json({ message: 'Ya existe una solicitud pendiente para este jugador.' });
    }

    // Agregar solicitud al propietario del equipo
   
    owner.solicitudesVinculacion.push({ playerId, requesterId });
    await owner.save();

    // Marcar jugador como pendiente de vinculación
    player.estadoVinculacion = 'pending';
    await player.save();

    res.status(200).json({ message: 'Solicitud enviada correctamente.' });
  } catch (error) {
    console.error('Error al enviar la solicitud:', error);
    res.status(500).json({ message: 'Error al enviar la solicitud.', error });
  }
});

router.post('/players/:playerId/handle-link', async (req, res) => {
  const { decision, requesterId } = req.body; // `decision` puede ser "accept" o "reject"
  const { playerId } = req.params;
 

  try {
    // Validar el valor de decision
    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decisión no válida. Debe ser "accept" o "reject".' });
    }

    // Obtener jugador y usuario solicitante
    const [player, requester] = await Promise.all([
      Player.findById(playerId).populate('equipo'),
      User.findById(requesterId),
    ]);

    if (!player) return res.status(404).json({ message: 'Jugador no encontrado.' });
    if (!requester) return res.status(404).json({ message: 'Usuario solicitante no encontrado.' });
    if (!player.equipo) return res.status(404).json({ message: 'El jugador no tiene equipo asociado.' });

    // Obtener propietario del equipo
    const owner = await User.findById(player.equipo.creadoPor);
    if (!owner) return res.status(404).json({ message: 'Propietario del equipo no encontrado.' });

    // Verificar si la solicitud existe
    const solicitudExiste = owner.solicitudesVinculacion.some(
      (solicitud) =>
        solicitud.playerId.toString() === playerId && solicitud.requesterId.toString() === requesterId
    );

    if (!solicitudExiste) {
      return res
        .status(400)
        .json({ message: 'No existe una solicitud pendiente para este jugador y usuario.' });
    }

    if (decision === 'accept') {
      // Verificar si el usuario ya está vinculado a otro jugador del mismo equipo
      const jugadoresVinculados = await Player.find({
        _id: { $in: requester.jugadoresVinculados },
        equipo: player.equipo._id,
      });

      if (jugadoresVinculados.length > 0) {
        return res
          .status(400)
          .json({ message: 'El usuario ya está vinculado a un jugador de este equipo.' });
      }

      // Vincular jugador al usuario solicitante
      player.usuarioVinculado = requester._id;
      player.estadoVinculacion = 'linked';
      requester.jugadoresVinculados.push(playerId);
    }

    // Eliminar la solicitud independientemente de la decisión
    owner.solicitudesVinculacion = owner.solicitudesVinculacion.filter(
      (solicitud) =>
        solicitud.playerId.toString() !== playerId || solicitud.requesterId.toString() !== requesterId
    );

    // Guardar cambios según la decisión
    if (decision === 'accept') {
      await Promise.all([player.save(), requester.save(), owner.save()]);
    } else {
      await owner.save(); // Solo guardamos al propietario en caso de "reject"
    }

    res
      .status(200)
      .json({ message: `Solicitud ${decision === 'accept' ? 'aceptada' : 'rechazada'}.` });
  } catch (error) {
    console.error('Error al manejar la solicitud de vinculación:', error);
    res.status(500).json({ message: 'Error al gestionar la solicitud.', error });
  }
});



router.get('/players/link-requests/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Obtener al usuario
    const user = await User.findById(userId).populate('solicitudesVinculacion');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Filtrar solicitudes de vinculación
    const requests = await Promise.all(
      user.solicitudesVinculacion.map(async ({ playerId, requesterId }) => {
        try {
          const [player, requester] = await Promise.all([
            Player.findById(playerId).populate('equipo'),
            User.findById(requesterId),
          ]);

          if (!player || !requester) {
            console.warn(`Datos faltantes: playerId=${playerId}, requesterId=${requesterId}`);
            return null; // Ignorar si faltan datos
          }

          return {
            playerId: player._id,
            playerName: player.name,
            requesterName: requester.name,
            playerTeam: player.equipo?.nombre || 'Sin equipo',
            requesterId: requester._id
          };
        } catch (err) {
          console.error('Error en solicitud individual:', err);
          return null; // Ignorar errores individuales
        }
      })
    );

    // Filtrar resultados nulos
    const filteredRequests = requests.filter((request) => request !== null);

    return res.status(200).json(filteredRequests); // Solo una respuesta
  } catch (error) {
    console.error('Error al obtener solicitudes de vinculación:', error);
    return res.status(500).json({ message: 'Error al obtener solicitudes de vinculación.', error });
  }
});





module.exports = router;

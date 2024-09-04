const express = require('express');
const passport = require('passport');
const User = require('../models/user');
const Team = require('../models/team');
const Complejo = require('../models/complejo');
const Cancha = require('../models/cancha');
const Reserva = require('../models/reserva');
const Player = require('../models/player');
const { ensureSuperUser } = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');

const router = express.Router();

// Obtener todos los usuarios
router.get('/admin/users', passport.authenticate('jwt', { session: false }), ensureSuperUser, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Cambiar el rol de un usuario
router.put('/admin/users/:id/role', passport.authenticate('jwt', { session: false }), ensureSuperUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al cambiar el rol del usuario:', error);
    res.status(500).json({ error: 'Error al cambiar el rol del usuario' });
  }
});

// Eliminar un usuario y todos los documentos relacionados
router.delete('/admin/users/:id', passport.authenticate('jwt', { session: false }), ensureSuperUser, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // Encontrar al usuario y verificar si existe
    const user = await User.findById(id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar equipos creados por el usuario
    const teams = await Team.find({ _id: { $in: user.equiposCreados } }).session(session);
    for (const team of teams) {
      // Eliminar jugadores asociados al equipo
      const players = await Player.find({ equipo: team._id }).session(session);
      for (const player of players) {
        // Solo eliminar la imagen si no es una imagen predefinida
        if (!player.image.startsWith('players/predefined_')) {
          await cloudinary.uploader.destroy(player.image); // Eliminar la imagen de Cloudinary
        }
        await Player.findByIdAndDelete(player._id).session(session);
      }

      // Eliminar la imagen del equipo si existe (y no es predefinida, si eso fuera aplicable)
      await cloudinary.uploader.destroy(team.escudo);
      await Team.findByIdAndDelete(team._id).session(session);
    }

    // Eliminar complejos asociados al usuario
    const complejos = await Complejo.find({ _id: { $in: user.complejos } }).session(session);
    for (const complejo of complejos) {
      // Eliminar canchas asociadas al complejo
      const canchas = await Cancha.find({ complejoAlQuePertenece: complejo._id }).session(session);
      for (const cancha of canchas) {
        // Eliminar la imagen de la cancha si existe
        if (cancha.imagen) {
          await cloudinary.uploader.destroy(cancha.imagen);
        }
        await Cancha.findByIdAndDelete(cancha._id).session(session);
      }
      
      // Eliminar reservas asociadas a las canchas del complejo
      await Reserva.deleteMany({ canchaId: { $in: canchas.map(c => c._id) } }).session(session);

      // Eliminar la imagen del complejo si existe
      if (complejo.imagen) {
        await cloudinary.uploader.destroy(complejo.imagen);
      }

      await Complejo.findByIdAndDelete(complejo._id).session(session);
    }

    // Finalmente, eliminar el usuario
    await User.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Usuario y todos los datos relacionados eliminados exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});


module.exports = router;

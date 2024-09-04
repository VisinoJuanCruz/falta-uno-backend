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
    await Team.deleteMany({ _id: { $in: user.equiposCreados } }).session(session);

    // Eliminar jugadores asociados a los equipos creados por el usuario
    await Player.deleteMany({ equipo: { $in: user.equiposCreados } }).session(session);

    // Eliminar complejos asociados al usuario
    await Complejo.deleteMany({ _id: { $in: user.complejos } }).session(session);

    // Eliminar canchas asociadas a los complejos del usuario
    const canchas = await Cancha.find({ complejoAlQuePertenece: { $in: user.complejos } }).session(session);
    const canchaIds = canchas.map(cancha => cancha._id);
    await Cancha.deleteMany({ _id: { $in: canchaIds } }).session(session);

    // Eliminar reservas asociadas a las canchas de los complejos del usuario
    await Reserva.deleteMany({ canchaId: { $in: canchaIds } }).session(session);

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

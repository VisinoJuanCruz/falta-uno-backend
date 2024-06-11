const Complejo = require('../models/complejo');

const authorizeUserForComplejo = async (req, res, next) => {
  const { complejoId } = req.params;
  const userId = req.user._id;

  try {
    const complejo = await Complejo.findById(complejoId);

    if (!complejo || complejo.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este complejo' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error de servidor' });
  }
};

module.exports = authorizeUserForComplejo;

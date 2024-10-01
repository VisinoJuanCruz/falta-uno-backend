require('dotenv').config()

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const canchasRoutes = require('./routes/canchas');
const complejosRoutes = require('./routes/complejos');
const reservasRoutes = require('./routes/reservas');
const adminRoutes = require('./routes/admin');

require('./config/passport-config');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
app.use(cors({
  origin: ['https://www.somosfulbo.com', 'https://somosfulbo.com', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static('images'));



mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/main`);

// Configuración de express-session
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', authRoutes);
app.use('/api', playerRoutes);
app.use('/api', userRoutes);
app.use('/api', teamRoutes);
app.use('/api', canchasRoutes);
app.use('/api', complejosRoutes);
app.use('/api', reservasRoutes);
app.use('/api', adminRoutes);

// Middleware de manejo de errores
app.use(function (err, req, res, next) {
  console.log('This is the invalid field ->', err.field);
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT} para testear`);
});

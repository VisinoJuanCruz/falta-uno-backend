// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth'); // Rutas de autenticación

const playerRoutes = require('./routes/players');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');

require('./config/passport-config');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://faltauno:nMECcDGnaXJZhi9f@faltauno.izyj3j0.mongodb.net/');

app.use(session({
  secret: 'teamamos',
  resave: false,
  saveUninitialized: false,
}));

// Inicializa Passport antes de usar las rutas de autenticación
app.use(passport.initialize());
app.use(passport.session());

// Importa y usa tus rutas de autenticación
app.use('/api', authRoutes);

// Resto de las rutas de tu aplicación...
app.use('/api', playerRoutes);
app.use('/api', userRoutes);
app.use('/api', teamRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

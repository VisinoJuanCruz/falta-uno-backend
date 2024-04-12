// Archivo: './backend/server.js'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/auth'); // Rutas de autenticación
const playerRoutes = require('./routes/players');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const canchasRoutes = require('./routes/canchas');
const complejosRoutes = require('./routes/complejos')
const reservasRoutes = require('./routes/reservas')


require('./config/passport-config');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static('images'))


mongoose.connect('mongodb+srv://faltauno:nMECcDGnaXJZhi9f@faltauno.izyj3j0.mongodb.net/');

// Configuración de express-session
app.use(session({
  secret: 'teamamos',
  resave: false,
  saveUninitialized: false,
}));

// Inicialización y configuración de Passport
app.use(passport.initialize());
app.use(passport.session());
 // Utilizar multer para manejar las solicitudes de multipart/form-data

// Importar y usar tus rutas de autenticación
app.use('/api', authRoutes);
app.use('/api', playerRoutes);
app.use('/api', userRoutes);
app.use('/api', teamRoutes);
app.use('/api', canchasRoutes);
app.use('/api', complejosRoutes);
app.use('/api', reservasRoutes);
app.use(function (err, req, res, next) {
  console.log('This is the invalid field ->', err.field)
  next(err)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

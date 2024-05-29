require('dotenv').config({ path: '.env.development' }); // Cargar las variables de entorno de .env.development

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
const complejosRoutes = require('./routes/complejos');
const reservasRoutes = require('./routes/reservas');

require('./config/passport-config');

const app = express();
const PORT = process.env.PORT || 3001;

console.log(process.env.DB_NAME)

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static('images'));

// Conexión a la base de datos MongoDB utilizando las variables de entorno
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`);

// Configuración de express-session
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Inicialización y configuración de Passport
app.use(passport.initialize());
app.use(passport.session());

// Importar y usar tus rutas de autenticación
app.use('/api', authRoutes);
app.use('/api', playerRoutes);
app.use('/api', userRoutes);
app.use('/api', teamRoutes);
app.use('/api', canchasRoutes);
app.use('/api', complejosRoutes);
app.use('/api', reservasRoutes);

app.use(function (err, req, res, next) {
  console.log('This is the invalid field ->', err.field);
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

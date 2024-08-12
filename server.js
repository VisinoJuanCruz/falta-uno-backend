require('dotenv').config({ path: '.env.development' });

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

require('./config/passport-config');

const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors({
  origin: 'https://aqua-pony-582263.hostingersite.com',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static('images'));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://aqua-pony-582263.hostingersite.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});



mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/main`);

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



app.use(function (err, req, res, next) {
  console.log('This is the invalid field ->', err.field);
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

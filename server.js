const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const playerRoutes = require('./routes/players');
const UserRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Conéctate a MongoDB (asegúrate de tener un servidor MongoDB en ejecución)
mongoose.connect('mongodb+srv://faltauno:nMECcDGnaXJZhi9f@faltauno.izyj3j0.mongodb.net/');

// Rutas para la API
app.use('/api', playerRoutes);
app.use('/api', UserRoutes);
app.use('/api', teamRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const bcrypt = require('bcrypt');
const User = require('../models/user');

// Configuración de la estrategia de autenticación local
passport.use(new LocalStrategy({
  usernameField: 'mail',
  passwordField: 'password'
}, async (mail, password, done) => {
  try {
    const user = await User.findOne({ mail });
    if (!user) {
      return done(null, false, { message: 'Usuario no encontrado' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Configuración de la estrategia de autenticación JWT
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'secret_key' // Clave secreta para firmar tokens JWT
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialización de usuarios
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialización de usuarios
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

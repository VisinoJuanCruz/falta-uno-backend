const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Usar otro servicio para producción
  auth: {
    user: 'visinodeveloper@gmail.com', // Tu correo
    pass: 'snnr owsq zmmr dsjh ' // Tu contraseña
  }
});

const sendWelcomeEmail = async (email) => {
  const mailOptions = {
    from: 'tuCorreo@gmail.com',
    to: email,
    subject: 'Bienvenido a Nuestro Sitio',
    text: 'Estamos muy contentos de tenerte con nosotros. ¡Gracias por registrarte!'
    // Puedes usar `html` en lugar de `text` para contenido HTML
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Email enviado: ', result);
  } catch (error) {
    console.error('Error al enviar email: ', error);
  }
};

const sendVerificationEmail = async (email, token) => {
  // Construye el enlace de verificación con el token
  const verificationLink = `http://localhost:3000/verify-email?token=${token}`;

  const mailOptions = {
    from: 'tuCorreo@gmail.com',
    to: email,
    subject: 'Verifica tu correo electrónico',
    html: `
      <p>Gracias por registrarte en nuestro sitio. Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
      <a href="${verificationLink}">${verificationLink}</a>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('Email de verificación enviado: ', result);
  } catch (error) {
    console.error('Error al enviar email de verificación: ', error);
  }
};

module.exports = { sendWelcomeEmail, sendVerificationEmail };

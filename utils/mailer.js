const nodemailer = require('nodemailer');

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



module.exports = sendWelcomeEmail;

// archivo : './backend/routes/complejos.js'
const express = require('express');
const router = express.Router();
const User = require('../models/user')
const Complejo = require('../models/complejo');
const Reserva = require('../models/reserva');
const multer = require('multer'); // Importar multer
const path = require('path'); // Importar el módulo 'path'

// Configurar Multer para manejar la carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './images/complejos'); // Ruta donde se guardarán las imágenes
  },
  filename: function (req, file, cb) {
    const filenameWithoutExtension = path.basename(file.originalname, path.extname(file.originalname));
    const newFilename = `${filenameWithoutExtension}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, newFilename);

  }
});

const upload = multer({ storage });


router.post('/complejos', upload.single('complejoImagen'), async (req, res) => {
  try {
    const formData = req.body;
    const imagen = req.file.path;

    console.log("DATOS:",formData)
    console.log("IMAGEN:", imagen)

    if (!imagen) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const nuevoComplejo = new Complejo({
      nombre: formData.nombre,
      imagen: imagen, // Guardar la ruta relativa de la imagen
      direccion: formData.direccion,
      telefono: formData.telefono,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      userId: formData.userId,
      canchas: []
    });

    const savedComplejo = await nuevoComplejo.save();
    await User.findByIdAndUpdate(formData.userId, { $push: { complejos: savedComplejo._id } });
    res.status(201).json(savedComplejo);
  } catch (error) {
    console.error('Error al agregar complejo:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/complejos', async (req, res) => {
  try {
    const complejos = await Complejo.find().populate('canchas');
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Obtener un complejo por ID
router.get('/complejos/:complejoId', async (req, res) => {
  const { complejoId } = req.params;

  try {
    const complejo = await Complejo.findById(complejoId).populate('canchas');
    if (!complejo) {
      return res.status(404).json({ message: 'Complejo no encontrado' });
    }
    console.log("DEVUELVE ESTO dsadsa:",complejo)
    res.json(complejo);
  } catch (error) {
    console.error('Error al obtener complejo por ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/complejos/:complejoId', upload.single('complejoImagen'), async (req, res) => {
  const { complejoId } = req.params;
  const formData = req.body;

  try {
    let updateFields = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      telefono: formData.telefono,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      userId: formData.userId,
    };

    // Verificar si se envió una nueva imagen
    if (req.file) {
      updateFields.imagen = req.file.path;
    }

    // Si hay datos de canchas en el formulario, actualizarlas
    
    const complejo = await Complejo.findByIdAndUpdate(complejoId, updateFields, { new: true });

    if (!complejo) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }

    res.json(complejo);
  } catch (error) {
    console.error('Error al editar complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor al editar complejo' });
  }
});

//BUSQUEDAS:
// Función para buscar complejos con canchas libres
const buscarComplejosConCanchaLibre = async (fecha) => {
  try {
    // Obtener la lista de todos los complejos con sus detalles y las canchas asociadas
    const complejos = await Complejo.find().populate('canchas');

    // Array para almacenar los complejos con canchas libres
    const complejosConCanchaLibre = [];

    // Iterar sobre cada complejo
    for (const complejo of complejos) {
      let tieneCanchaLibre = false;

      // Iterar sobre las canchas del complejo
      for (const cancha of complejo.canchas) {
        // Buscar reservas existentes para la cancha en la fecha seleccionada
        const reservas = await Reserva.find({
          canchaId: cancha._id,
          horaInicio: fecha, // Buscar reservas con horaInicio igual a la fecha seleccionada
          reservado:true
          
        });

        // Si no hay reservas para la cancha en la fecha seleccionada, establecer la bandera como verdadera
        if (reservas.length === 0) {
          tieneCanchaLibre = true;
          break; // No es necesario seguir buscando en las demás canchas del complejo
        }
      }

      // Si al menos una cancha está libre en el complejo, agregar el complejo a la lista
      if (tieneCanchaLibre) {
        complejosConCanchaLibre.push(complejo);
      }
    }

    console.log(complejosConCanchaLibre);
    return complejosConCanchaLibre;
  } catch (error) {
    console.error('Error al buscar complejos con canchas libres:', error);
    throw new Error('Error al buscar complejos con canchas libres. Por favor, intenta de nuevo más tarde.');
  }
};




// Endpoint para buscar complejos con canchas libres en una fecha y hora específicas
router.post('/complejos/buscar', async (req, res) => {
  const { fecha } = req.body; // Recibe el día, fecha y hora seleccionados por el usuario
  
  try {
    // Utilizar la función para buscar complejos con canchas libres
    const complejosConCanchaLibre = await buscarComplejosConCanchaLibre(fecha);
    console.log("DEVUELVE ESTO",complejosConCanchaLibre)
    res.json(complejosConCanchaLibre);
  } catch (error) {
    console.error('Error al buscar complejos con canchas libres:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


module.exports = router;

// server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

// Importar las rutas
const profesoresRoutes = require('./routes/profesores');
const horariosRoutes = require('./routes/horarios');
const administradoresRoutes = require('./routes/administradores');
const perfilRoutes = require('./routes/perfil');
const periodosRoutes = require('./routes/periodos');
const mensajesRoutes = require('./routes/mensajes');
const usuariosRoutes = require('./routes/usuarios');
const licenciasRoutes = require('./routes/licencias');

const app = express();

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta';

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Hacer pública la carpeta de subida de archivos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurar CORS para permitir peticiones desde Railway y localhost
const allowedOrigins = [
  'http://localhost:5173',
  'https://sanjose-front-production.up.railway.app',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Middleware para manejar JSON
app.use(express.json());

// Middleware para autenticar usuarios mediante JWT
const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para permitir solo el acceso a administradores
const soloAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'administrador') {
    next();
  } else {
    return res.status(403).json({ message: 'Permisos insuficientes' });
  }
};

// Ruta para inicio de sesión
app.post('/api/login', async (req, res) => {
  const { email, contrasena } = req.body;

  // Agregar logs para verificar los datos recibidos
  console.log('Datos recibidos para login:');
  console.log('Email:', email);
  console.log('Contraseña:', contrasena);

  try {
    // Verificar si el email existe en la base de datos
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      console.log('Usuario no encontrado en la base de datos');
      return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
    }

    // Comparar la contraseña
    const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!passwordMatch) {
      console.log('Contraseña incorrecta');
      return res.status(400).json({ message: 'Correo o contraseña incorrectos' });
    }

    // Generar el token
    const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: '1h' });

    console.log('Login exitoso');
    return res.json({
      token,
      nombre: user.nombre,
      email: user.email,
      tipoUsuario: user.rol,
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener los detalles del usuario autenticado
app.get('/api/user-details', autenticarToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
    const user = users[0];

    if (user) {
      let foto_perfil = null;

      if (user.rol === 'administrador') {
        const [admins] = await pool.query(
          'SELECT foto_perfil FROM administradores WHERE usuario_id = ?',
          [user.id]
        );
        if (admins.length > 0) {
          foto_perfil = admins[0].foto_perfil;
        }
      } else if (user.rol === 'profesor') {
        const [profesores] = await pool.query(
          'SELECT id FROM profesores WHERE usuario_id = ?',
          [user.id]
        );
        if (profesores.length > 0) {
          const profesorId = profesores[0].id;
          const [perfilRows] = await pool.query(
            'SELECT foto_perfil FROM perfil WHERE profesor_id = ?',
            [profesorId]
          );
          if (perfilRows.length > 0) {
            foto_perfil = perfilRows[0].foto_perfil;
          }
        }
      }

      return res.json({
        nombre: user.nombre,
        email: user.email,
        tipoUsuario: user.rol,
        foto_perfil,
      });
    } else {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error en /api/user-details:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas de la API protegidas
app.use('/api/profesores', autenticarToken, profesoresRoutes);
app.use('/api/horarios', autenticarToken, horariosRoutes);
app.use('/api/administradores', autenticarToken, soloAdmin, administradoresRoutes);
app.use('/api/perfil', autenticarToken, perfilRoutes);
app.use('/api', autenticarToken, periodosRoutes);
app.use('/api/mensajes', autenticarToken, mensajesRoutes);
app.use('/api/usuarios', autenticarToken, usuariosRoutes);
app.use('/api', autenticarToken, licenciasRoutes);

// Middleware global para manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

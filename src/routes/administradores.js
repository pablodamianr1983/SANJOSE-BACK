const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para la subida de fotos de perfil
const storagePerfiles = multer.diskStorage({
  destination: (req, file, cb) => {
    // Asegúrate de que esta carpeta exista en tu sistema de archivos
    const dir = 'uploads/perfiles-administradores/';
    cb(null, dir); // Ruta para guardar fotos
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nombre único para cada archivo
  },
});

const uploadPerfiles = multer({ storage: storagePerfiles });

// Obtener todos los administradores
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT administradores.*, usuarios.email 
      FROM administradores 
      JOIN usuarios ON administradores.usuario_id = usuarios.id
    `);
    res.json(results);
  } catch (error) {
    console.error('Error en GET /api/administradores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo administrador
router.post('/', async (req, res) => {
  const { nombre, email, telefono, contrasena } = req.body;
  try {
    // Verificar si el email ya existe
    const [existingUsers] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear usuario en la tabla usuarios
    const [userResult] = await pool.query(
      'INSERT INTO usuarios (nombre, email, contrasena, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, 'administrador']
    );
    const usuarioId = userResult.insertId;

    // Crear administrador en la tabla administradores
    const [adminResult] = await pool.query(
      'INSERT INTO administradores (nombre, email, telefono, usuario_id) VALUES (?, ?, ?, ?)',
      [nombre, email, telefono, usuarioId]
    );

    res.json({ id: adminResult.insertId, nombre, email, telefono, usuario_id: usuarioId });
  } catch (error) {
    console.error('Error en POST /api/administradores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un administrador
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, contrasena } = req.body;
  try {
    // Actualizar datos en la tabla usuarios
    if (contrasena) {
      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ?, contrasena = ? WHERE id = (SELECT usuario_id FROM administradores WHERE id = ?)',
        [nombre, email, hashedPassword, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE id = (SELECT usuario_id FROM administradores WHERE id = ?)',
        [nombre, email, id]
      );
    }

    // Actualizar datos en la tabla administradores
    await pool.query(
      'UPDATE administradores SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
      [nombre, email, telefono, id]
    );

    res.json({ id, nombre, email, telefono });
  } catch (error) {
    console.error('Error en PUT /api/administradores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Subir foto de perfil de un administrador
router.post('/:id/foto-perfil', uploadPerfiles.single('foto_perfil'), async (req, res) => {
  const { id } = req.params;
  const fotoPerfil = req.file;

  if (!fotoPerfil) {
    return res.status(400).json({ message: 'No se ha subido ninguna foto' });
  }

  try {
    // Guardar la ruta relativa accesible desde el navegador
    const filePath = `/uploads/perfiles-administradores/${fotoPerfil.filename}`;
    await pool.query(
      'UPDATE administradores SET foto_perfil = ? WHERE id = ?',
      [filePath, id]
    );

    res.json({ message: 'Foto de perfil actualizada correctamente', foto_perfil: filePath });
  } catch (error) {
    console.error('Error al subir la foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil de un administrador específico
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [admin] = await pool.query('SELECT * FROM administradores WHERE id = ?', [id]);
    if (!admin.length) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }
    res.json(admin[0]);
  } catch (error) {
    console.error('Error en GET /api/administradores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un administrador
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener usuario_id antes de eliminar
    const [admins] = await pool.query('SELECT usuario_id FROM administradores WHERE id = ?', [id]);
    const usuarioId = admins[0]?.usuario_id;
    if (!usuarioId) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    // Eliminar administrador
    await pool.query('DELETE FROM administradores WHERE id = ?', [id]);

    // Eliminar usuario asociado
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);

    res.json({ message: 'Administrador eliminado' });
  } catch (error) {
    console.error('Error en DELETE /api/administradores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

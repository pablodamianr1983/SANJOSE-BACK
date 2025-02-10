// routes/profesores.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');

// Obtener todos los profesores
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT profesores.*, usuarios.email 
      FROM profesores 
      JOIN usuarios ON profesores.usuario_id = usuarios.id
    `);
    res.json(results);
  } catch (error) {
    console.error('Error en GET /api/profesores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo profesor
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
      [nombre, email, hashedPassword, 'profesor']
    );

    const usuarioId = userResult.insertId;

    // Crear profesor en la tabla profesores
    const [profesorResult] = await pool.query(
      'INSERT INTO profesores (nombre, email, telefono, usuario_id) VALUES (?, ?, ?, ?)',
      [nombre, email, telefono, usuarioId]
    );

    res.json({ id: profesorResult.insertId, nombre, email, telefono, usuario_id: usuarioId });
  } catch (error) {
    console.error('Error en POST /api/profesores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un profesor
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, contrasena } = req.body;
  try {
    // Actualizar datos en la tabla usuarios
    if (contrasena) {
      // Encriptar nueva contraseña
      const hashedPassword = await bcrypt.hash(contrasena, 10);
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ?, contrasena = ? WHERE id = (SELECT usuario_id FROM profesores WHERE id = ?)',
        [nombre, email, hashedPassword, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE id = (SELECT usuario_id FROM profesores WHERE id = ?)',
        [nombre, email, id]
      );
    }

    // Actualizar datos en la tabla profesores
    await pool.query(
      'UPDATE profesores SET nombre = ?, email = ?, telefono = ? WHERE id = ?',
      [nombre, email, telefono, id]
    );

    res.json({ id, nombre, email, telefono });
  } catch (error) {
    console.error('Error en PUT /api/profesores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un profesor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener usuario_id antes de eliminar
    const [profesores] = await pool.query('SELECT usuario_id FROM profesores WHERE id = ?', [id]);
    const usuarioId = profesores[0]?.usuario_id;

    if (!usuarioId) {
      return res.status(404).json({ message: 'Profesor no encontrado' });
    }

    // Eliminar profesor
    await pool.query('DELETE FROM profesores WHERE id = ?', [id]);

    // Eliminar usuario asociado
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);

    res.json({ message: 'Profesor eliminado' });
  } catch (error) {
    console.error('Error en DELETE /api/profesores/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
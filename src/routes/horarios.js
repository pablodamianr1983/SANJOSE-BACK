// routes/horarios.js

const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener horarios por profesor
router.get('/profesor/:profesorId', async (req, res) => {
  const { profesorId } = req.params;

  try {
    if (req.user.rol === 'profesor') {
      // Verificar que el profesor solo acceda a sus propios horarios
      const [profesores] = await pool.query('SELECT id FROM profesores WHERE usuario_id = ?', [req.user.id]);
      if (profesores.length === 0 || profesores[0].id != profesorId) {
        return res.status(403).json({ message: 'No tienes permiso para ver estos horarios' });
      }
    }
    // Los administradores pueden acceder a cualquier horario
    const [results] = await pool.query('SELECT * FROM horarios WHERE profesor_id = ?', [profesorId]);
    res.json(results);
  } catch (error) {
    console.error('Error en GET /api/horarios/profesor/:profesorId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo horario para un profesor
router.post('/', async (req, res) => {
  const { profesor_id, dia, hora_inicio, hora_fin, anotaciones, grupo } = req.body;
  try {
    // Validar permisos
    if (req.user.rol === 'profesor') {
      // Verificar que el profesor solo pueda crear horarios para sí mismo
      const [profesores] = await pool.query('SELECT id FROM profesores WHERE usuario_id = ?', [req.user.id]);
      if (profesores.length === 0 || profesores[0].id != profesor_id) {
        return res.status(403).json({ message: 'No tienes permiso para crear horarios para este profesor' });
      }
    }
    // Crear horario
    const [result] = await pool.query(
      'INSERT INTO horarios (profesor_id, dia, hora_inicio, hora_fin, anotaciones, grupo) VALUES (?, ?, ?, ?, ?, ?)',
      [profesor_id, dia, hora_inicio, hora_fin, anotaciones, grupo]
    );
    res.json({ id: result.insertId, profesor_id, dia, hora_inicio, hora_fin, anotaciones, grupo });
  } catch (error) {
    console.error('Error en POST /api/horarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un horario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { dia, hora_inicio, hora_fin, anotaciones, grupo } = req.body;
  try {
    // Validar permisos
    // (Agregar validación si es necesario)
    await pool.query(
      'UPDATE horarios SET dia = ?, hora_inicio = ?, hora_fin = ?, anotaciones = ?, grupo = ? WHERE id = ?',
      [dia, hora_inicio, hora_fin, anotaciones, grupo, id]
    );
    res.json({ id, dia, hora_inicio, hora_fin, anotaciones, grupo });
  } catch (error) {
    console.error('Error en PUT /api/horarios/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un horario
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Validar permisos
    // (Agregar validación si es necesario)
    await pool.query('DELETE FROM horarios WHERE id = ?', [id]);
    res.json({ message: 'Horario eliminado' });
  } catch (error) {
    console.error('Error en DELETE /api/horarios/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
// routes/licencias.js

const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1) Obtener todas las licencias de un profesor
router.get('/profesores/:profesorId/licencias', async (req, res) => {
  const { profesorId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM licencias WHERE profesor_id = ? ORDER BY fecha_inicio',
      [profesorId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener licencias:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2) Crear una nueva licencia
router.post('/profesores/:profesorId/licencias', async (req, res) => {
  const { profesorId } = req.params;
  const { fecha_inicio, fecha_fin, motivo } = req.body;

  if (!fecha_inicio) {
    return res.status(400).json({ error: 'La fecha de inicio es obligatoria.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO licencias (profesor_id, fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?, ?)',
      [profesorId, fecha_inicio, fecha_fin || null, motivo || null]
    );
    res.status(201).json({ message: 'Licencia creada correctamente', id: result.insertId });
  } catch (error) {
    console.error('Error al crear licencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3) Actualizar una licencia existente
router.put('/profesores/:profesorId/licencias/:licenciaId', async (req, res) => {
  const { profesorId, licenciaId } = req.params;
  const { fecha_inicio, fecha_fin, motivo } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE licencias
       SET fecha_inicio = ?, fecha_fin = ?, motivo = ?
       WHERE id = ? AND profesor_id = ?`,
      [fecha_inicio, fecha_fin || null, motivo || null, licenciaId, profesorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Licencia no encontrada.' });
    }

    res.json({ message: 'Licencia actualizada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar licencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4) Eliminar una licencia
router.delete('/profesores/:profesorId/licencias/:licenciaId', async (req, res) => {
  const { profesorId, licenciaId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM licencias WHERE id = ? AND profesor_id = ?',
      [licenciaId, profesorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Licencia no encontrada.' });
    }

    res.json({ message: 'Licencia eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar licencia:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// routes/periodos.js

const express = require('express');
const router = express.Router();
const pool = require('../db');

/* =====================================
   RUTAS PARA PERÍODOS INTERNOS
   (tabla: periodos_trabajo)
   ===================================== */

// Obtener todos los periodos internos de un profesor
router.get('/profesores/:profesorId/periodos', async (req, res) => {
  const { profesorId } = req.params;
  try {
    const [periodos] = await pool.query(
      'SELECT * FROM periodos_trabajo WHERE profesor_id = ? ORDER BY fecha_ingreso',
      [profesorId]
    );
    res.json(periodos);
  } catch (error) {
    console.error('Error al obtener los periodos internos:', error.message);
    res.status(500).json({ error: 'Error al obtener los periodos internos.' });
  }
});

// Añadir un nuevo periodo interno (sin campo "empresa")
router.post('/profesores/:profesorId/periodos', async (req, res) => {
  const { profesorId } = req.params;
  const { fecha_ingreso, fecha_egreso } = req.body;

  // Validación básica
  if (!fecha_ingreso) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso es obligatoria.' });
  }

  if (fecha_egreso && new Date(fecha_ingreso) > new Date(fecha_egreso)) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso no puede ser posterior a la fecha de egreso.' });
  }

  try {
    // Insertamos únicamente las columnas que sí existen en periodos_trabajo
    const [result] = await pool.query(
      'INSERT INTO periodos_trabajo (profesor_id, fecha_ingreso, fecha_egreso) VALUES (?, ?, ?)',
      [profesorId, fecha_ingreso, fecha_egreso || null]
    );
    res
      .status(201)
      .json({ message: 'Periodo interno agregado correctamente.', id: result.insertId });
  } catch (error) {
    console.error('Error al agregar periodo interno:', error.message);
    res.status(500).json({ error: 'Error al agregar el periodo interno.' });
  }
});

// Actualizar un periodo interno (sin campo "empresa")
router.put('/profesores/:profesorId/periodos/:periodoId', async (req, res) => {
  const { profesorId, periodoId } = req.params;
  const { fecha_ingreso, fecha_egreso } = req.body;

  // Validación básica
  if (!fecha_ingreso) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso es obligatoria.' });
  }

  if (fecha_egreso && new Date(fecha_ingreso) > new Date(fecha_egreso)) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso no puede ser posterior a la fecha de egreso.' });
  }

  try {
    // Actualizamos únicamente las columnas válidas
    const [result] = await pool.query(
      `UPDATE periodos_trabajo
       SET fecha_ingreso = ?, fecha_egreso = ?
       WHERE id = ? AND profesor_id = ?`,
      [fecha_ingreso, fecha_egreso || null, periodoId, profesorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Periodo interno no encontrado.' });
    }

    res.json({ message: 'Periodo interno actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar periodo interno:', error.message);
    res.status(500).json({ error: 'Error al actualizar el periodo interno.' });
  }
});

// Eliminar un periodo interno
router.delete('/profesores/:profesorId/periodos/:periodoId', async (req, res) => {
  const { profesorId, periodoId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM periodos_trabajo WHERE id = ? AND profesor_id = ?',
      [periodoId, profesorId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Periodo interno no encontrado.' });
    }
    res.json({ message: 'Periodo interno eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar periodo interno:', error.message);
    res.status(500).json({ error: 'Error al eliminar el periodo interno.' });
  }
});

/* =====================================
   RUTAS PARA PERÍODOS EXTERNOS
   (tabla: periodos_externos)
   ===================================== */

// Obtener todos los periodos externos de un profesor
router.get('/profesores/:profesorId/periodos-externos', async (req, res) => {
  const { profesorId } = req.params;
  try {
    const [periodos] = await pool.query(
      'SELECT * FROM periodos_externos WHERE profesor_id = ? ORDER BY fecha_ingreso',
      [profesorId]
    );
    res.json(periodos);
  } catch (error) {
    console.error('Error al obtener los periodos externos:', error.message);
    res.status(500).json({ error: 'Error al obtener los periodos externos.' });
  }
});

// Añadir un nuevo periodo externo (con campo "empresa")
router.post('/profesores/:profesorId/periodos-externos', async (req, res) => {
  const { profesorId } = req.params;
  const { empresa, fecha_ingreso, fecha_egreso } = req.body;

  if (!empresa || !fecha_ingreso) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: empresa y fecha_ingreso.' });
  }

  if (fecha_egreso && new Date(fecha_ingreso) > new Date(fecha_egreso)) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso no puede ser posterior a la fecha de egreso.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO periodos_externos (profesor_id, empresa, fecha_ingreso, fecha_egreso) VALUES (?, ?, ?, ?)',
      [profesorId, empresa, fecha_ingreso, fecha_egreso || null]
    );
    res
      .status(201)
      .json({ message: 'Periodo externo agregado correctamente.', id: result.insertId });
  } catch (error) {
    console.error('Error al agregar periodo externo:', error.message);
    res.status(500).json({ error: 'Error al agregar el periodo externo.' });
  }
});

// Actualizar un periodo externo (con campo "empresa")
router.put('/profesores/:profesorId/periodos-externos/:periodoId', async (req, res) => {
  const { periodoId } = req.params;
  const { empresa, fecha_ingreso, fecha_egreso } = req.body;

  if (!empresa || !fecha_ingreso) {
    return res
      .status(400)
      .json({ error: 'Faltan campos obligatorios: empresa y fecha_ingreso.' });
  }

  if (fecha_egreso && new Date(fecha_ingreso) > new Date(fecha_egreso)) {
    return res
      .status(400)
      .json({ error: 'La fecha de ingreso no puede ser posterior a la fecha de egreso.' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE periodos_externos SET empresa = ?, fecha_ingreso = ?, fecha_egreso = ? WHERE id = ?',
      [empresa, fecha_ingreso, fecha_egreso || null, periodoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Periodo externo no encontrado.' });
    }

    res.json({ message: 'Periodo externo actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar periodo externo:', error.message);
    res.status(500).json({ error: 'Error al actualizar el periodo externo.' });
  }
});

// Eliminar un periodo externo
router.delete('/profesores/:profesorId/periodos-externos/:periodoId', async (req, res) => {
  const { periodoId } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM periodos_externos WHERE id = ?', [periodoId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Periodo externo no encontrado.' });
    }
    res.json({ message: 'Periodo externo eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar periodo externo:', error.message);
    res.status(500).json({ error: 'Error al eliminar el periodo externo.' });
  }
});

module.exports = router;

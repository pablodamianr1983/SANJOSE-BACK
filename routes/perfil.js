// routes/perfil.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Función para calcular la diferencia entre dos fechas en años, meses y días
function calculateTimeDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

// Función para calcular la edad
function calculateAge(fechaNacimiento) {
  return calculateTimeDifference(fechaNacimiento, new Date());
}

// Configuración de multer para almacenar archivos en la carpeta uploads/perfiles
const storagePerfiles = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/perfiles/'); // Carpeta donde se guardarán las fotos de perfil
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadPerfiles = multer({ storage: storagePerfiles });

// Ruta para subir la foto de perfil de un profesor
router.post(
  '/:id/foto-perfil',
  uploadPerfiles.single('foto_perfil'),
  async (req, res) => {
    const { id } = req.params;
    const fotoPerfil = req.file;

    try {
      // Actualizar la ruta de la foto de perfil en la base de datos
      await pool.query(
        'UPDATE perfil SET foto_perfil = ? WHERE profesor_id = ?',
        [fotoPerfil.path, id]
      );
      res.json({ message: 'Foto de perfil actualizada correctamente' });
    } catch (error) {
      console.error('Error al subir la foto de perfil:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Ruta para eliminar la foto de perfil de un profesor
router.delete('/:id/foto-perfil', async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener la ruta de la foto de perfil
    const [perfilData] = await pool.query(
      'SELECT foto_perfil FROM perfil WHERE profesor_id = ?',
      [id]
    );

    if (perfilData.length === 0 || !perfilData[0].foto_perfil) {
      return res.status(404).json({ message: 'Foto de perfil no encontrada' });
    }

    const fotoPerfilPath = perfilData[0].foto_perfil;

    // Eliminar el archivo físico
    fs.unlink(fotoPerfilPath, async (err) => {
      if (err) {
        console.error('Error al eliminar el archivo físico:', err);
        return res.status(500).json({ message: 'Error al eliminar la foto de perfil' });
      }

      // Actualizar la base de datos
      await pool.query(
        'UPDATE perfil SET foto_perfil = NULL WHERE profesor_id = ?',
        [id]
      );

      res.json({ message: 'Foto de perfil eliminada correctamente' });
    });
  } catch (error) {
    console.error('Error al eliminar la foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para subir archivos específicos al perfil del profesor
router.post(
  '/:id/archivos/:tipo_documento',
  uploadPerfiles.single('archivo'),
  async (req, res) => {
    const { id, tipo_documento } = req.params;
    const archivo = req.file;

    try {
      await pool.query(
        'INSERT INTO archivos_profesor (profesor_id, nombre_archivo, tipo_archivo, ruta_archivo, tipo_documento, fecha_subida) VALUES (?, ?, ?, ?, ?, NOW())',
        [id, archivo.originalname, archivo.mimetype, archivo.path, tipo_documento]
      );
      res.json({ message: 'Archivo subido correctamente' });
    } catch (error) {
      console.error('Error al subir archivo:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Ruta para eliminar un archivo específico
router.delete('/:id/archivos/:tipo_documento', async (req, res) => {
  const { id, tipo_documento } = req.params;

  try {
    // Obtener la ruta del archivo en la base de datos
    const [archivoData] = await pool.query(
      'SELECT ruta_archivo FROM archivos_profesor WHERE profesor_id = ? AND tipo_documento = ?',
      [id, tipo_documento]
    );

    if (archivoData.length === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const archivoPath = archivoData[0].ruta_archivo;

    // Eliminar el registro del archivo en la base de datos
    await pool.query(
      'DELETE FROM archivos_profesor WHERE profesor_id = ? AND tipo_documento = ?',
      [id, tipo_documento]
    );

    // Eliminar el archivo físico del sistema de archivos
    fs.unlink(archivoPath, (err) => {
      if (err) {
        console.error('Error al eliminar el archivo físico:', err);
        return res.status(500).json({ message: 'Error al eliminar el archivo físico' });
      }
      res.json({ message: 'Archivo eliminado correctamente' });
    });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener los archivos de un profesor, incluyendo la fecha de carga
router.get('/:id/archivos', async (req, res) => {
  const { id } = req.params;
  try {
    const [archivos] = await pool.query(
      'SELECT tipo_documento, nombre_archivo, tipo_archivo, ruta_archivo, fecha_subida FROM archivos_profesor WHERE profesor_id = ?',
      [id]
    );
    res.json(archivos);
  } catch (error) {
    console.error('Error al obtener archivos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener el perfil de un profesor
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'SELECT * FROM perfil WHERE profesor_id = ?',
      [id]
    );
    if (result.length === 0) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }

    const perfil = result[0];

    // Obtener periodos de trabajo
    const [periodos] = await pool.query(
      'SELECT * FROM periodos_trabajo WHERE profesor_id = ? ORDER BY fecha_ingreso',
      [id]
    );

    // Calcular edad actual
    if (perfil.fecha_nacimiento) {
      perfil.edad_actual = calculateAge(perfil.fecha_nacimiento);
    } else {
      perfil.edad_actual = null;
    }

    // Calcular total de tiempo trabajado
    let totalYears = 0;
    let totalMonths = 0;
    let totalDays = 0;

    for (const periodo of periodos) {
      const tiempoTrabajado = calculateTimeDifference(
        periodo.fecha_ingreso,
        periodo.fecha_egreso
      );

      totalYears += tiempoTrabajado.years;
      totalMonths += tiempoTrabajado.months;
      totalDays += tiempoTrabajado.days;
    }

    // Ajustar los días y meses acumulados
    if (totalDays >= 30) {
      totalMonths += Math.floor(totalDays / 30);
      totalDays = totalDays % 30;
    }

    if (totalMonths >= 12) {
      totalYears += Math.floor(totalMonths / 12);
      totalMonths = totalMonths % 12;
    }

    perfil.total_tiempo_trabajado = {
      years: totalYears,
      months: totalMonths,
      days: totalDays,
    };

    perfil.periodos_trabajo = periodos;

    res.json(perfil);
  } catch (error) {
    console.error('Error en GET /api/perfil/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar el perfil de un profesor (se añade campo `email`)
router.post('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellido,
    dni,
    direccion,
    telefono_celular,
    fecha_nacimiento,
    anotacion,
    cargo,
    sexo,
    estado_civil,
    cuil,
    tel_contacto_emergencias,
    observaciones,
    email, // Nuevo campo para manejar el email
  } = req.body;

  try {
    const fechaNacimientoValue =
      fecha_nacimiento && fecha_nacimiento.trim() !== '' ? fecha_nacimiento : null;

    const [existingProfile] = await pool.query('SELECT * FROM perfil WHERE profesor_id = ?', [id]);

    if (existingProfile.length === 0) {
      // Crear nuevo perfil (incluye email)
      await pool.query(
        `INSERT INTO perfil (
          profesor_id,
          nombre,
          apellido,
          dni,
          direccion,
          telefono_celular,
          fecha_nacimiento,
          anotacion,
          cargo,
          sexo,
          estado_civil,
          cuil,
          tel_contacto_emergencias,
          observaciones,
          email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

        [
          id,
          nombre,
          apellido,
          dni,
          direccion,
          telefono_celular,
          fechaNacimientoValue,
          anotacion,
          cargo,
          sexo,
          estado_civil,
          cuil,
          tel_contacto_emergencias,
          observaciones,
          email,
        ]
      );
      return res.json({ message: 'Perfil creado correctamente' });
    } else {
      // Actualizar perfil existente (incluye email)
      await pool.query(
        `UPDATE perfil SET 
          nombre = ?, 
          apellido = ?, 
          dni = ?, 
          direccion = ?, 
          telefono_celular = ?, 
          fecha_nacimiento = ?, 
          anotacion = ?, 
          cargo = ?, 
          sexo = ?, 
          estado_civil = ?,
          cuil = ?,
          tel_contacto_emergencias = ?,
          observaciones = ?,
          email = ?
          WHERE profesor_id = ?`,

        [
          nombre,
          apellido,
          dni,
          direccion,
          telefono_celular,
          fechaNacimientoValue,
          anotacion,
          cargo,
          sexo,
          estado_civil,
          cuil,
          tel_contacto_emergencias,
          observaciones,
          email,
          id,
        ]
      );
      return res.json({ message: 'Perfil actualizado correctamente' });
    }
  } catch (error) {
    console.error('Error en POST /api/perfil/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

/* =================================================== */
/* NUEVO: RUTA PARA SUBIR ARCHIVOS ADICIONALES CON TÍTULO */
/* (Ejemplo de endpoint alternativo a la lógica “:tipo_documento”) */
/* =================================================== */
router.post(
  '/:id/archivos-adicionales',
  uploadPerfiles.single('archivo'),
  async (req, res) => {
    const { id } = req.params;    // profesor_id
    const { titulo } = req.body;  // campo extra proveniente de FormData
    const archivo = req.file;

    if (!archivo) {
      return res.status(400).json({ message: 'No se ha enviado ningún archivo' });
    }

    try {
      // Se asume que en la tabla 'archivos_profesor' existe la columna 'titulo'
      await pool.query(
        `INSERT INTO archivos_profesor
         (profesor_id, nombre_archivo, tipo_archivo, ruta_archivo, fecha_subida, titulo)
         VALUES (?, ?, ?, ?, NOW(), ?)`,
        [id, archivo.originalname, archivo.mimetype, archivo.path, titulo || null]
      );

      return res.json({ message: 'Archivo adicional subido correctamente' });
    } catch (error) {
      console.error('Error al subir archivo adicional:', error);
      return res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

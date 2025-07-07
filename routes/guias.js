// routes/guias.js
import express from 'express';
import Guia from '../models/guia.js';

const router = express.Router();

// Obtener guía por categoría y colección
router.get('/', async (req, res) => {
  try {
    const { categoria, coleccion } = req.query;
    if (!categoria || !coleccion) {
      return res.status(400).json({ error: 'Faltan parámetros: categoria y coleccion' });
    }

    const guia = await Guia.findOne({ categoria, coleccion });
    if (!guia) return res.status(404).json(null);

    res.json(guia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la guía' });
  }
});

// Crear o actualizar una guía
router.post('/', async (req, res) => {
  try {
    const { categoria, coleccion, campos, valores, descripcion } = req.body;

    if (!categoria || !coleccion || !campos || !valores) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const actualizada = await Guia.findOneAndUpdate(
      { categoria, coleccion },
      { campos, valores, descripcion },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(actualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la guía' });
  }
});

export default router;

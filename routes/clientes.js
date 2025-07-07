import express from 'express';
import Cliente from '../models/Cliente.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// Crear cliente
router.post('/', auth, async (req, res) => {
  try {
    const nuevo = new Cliente(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: 'No se pudo crear el cliente' });
  }
});

// Obtener todos los clientes
router.get('/', auth, async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Editar cliente
router.put('/:id', auth, async (req, res) => {
  try {
    const actualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente
router.delete('/:id', auth, async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;

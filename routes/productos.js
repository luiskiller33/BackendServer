import express from 'express';
import Producto from '../models/Producto.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Crear producto
router.post('/', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, coleccion, genero, stock } = req.body;

    const nuevasImagenes = req.files?.map(file => ({
      url: file.path,
      public_id: file.filename || file.public_id
    })) || [];

    const producto = new Producto({
      nombre,
      descripcion,
      precio,
      categoria,
      coleccion,
      genero,
      stock: JSON.parse(stock),
      imagenes: nuevasImagenes
    });

    await producto.save();
    res.status(201).json(producto);
  } catch (err) {
    console.error('❌ Error al crear producto:', err);
    res.status(500).json({ mensaje: 'Error al crear el producto', error: err.message });
  }
});

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});

// Obtener por ID
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener producto' });
  }
});

// Actualizar
router.put('/:id', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, coleccion, genero, stock, imagenesActuales } = req.body;
    const imagenesExistentes = imagenesActuales ? JSON.parse(imagenesActuales) : [];

    const nuevasImagenes = req.files?.map(file => ({
      url: file.path,
      public_id: file.filename || file.public_id
    })) || [];

    const imagenesFinales = [...imagenesExistentes, ...nuevasImagenes];

    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      {
        nombre,
        descripcion,
        precio,
        categoria,
        coleccion,
        genero,
        stock: JSON.parse(stock),
        imagenes: imagenesFinales
      },
      { new: true }
    );

    res.json(productoActualizado);
  } catch (err) {
    console.error('❌ Error al actualizar producto:', err);
    res.status(500).json({ mensaje: 'Error al actualizar el producto', error: err.message });
  }
});

// Eliminar
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    for (const img of producto.imagenes) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: err.message });
  }
});

// Categorías y colecciones únicas
router.get('/opciones/unicas', async (req, res) => {
  try {
    const productos = await Producto.find({}, 'categoria coleccion');
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
    const colecciones = [...new Set(productos.map(p => p.coleccion).filter(Boolean))];
    res.json({ categorias, colecciones });
  } catch (err) {
    console.error('❌ Error en /opciones/unicas:', err);
    res.status(500).json({ mensaje: 'Error al obtener opciones únicas' });
  }
});

export default router;

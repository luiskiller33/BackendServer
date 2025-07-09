import express from 'express';
import Producto from '../models/Producto.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const router = express.Router();

// Crear producto
router.post('/', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, coleccion, genero, stock } = req.body;

    const nuevasImagenes = [];
    for (const file of req.files || []) {
      const result = await cloudinary.uploader.upload(file.path);
      nuevasImagenes.push({
        url: result.secure_url,
        public_id: result.public_id
      });
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.warn('No se pudo borrar archivo temporal:', file.path);
      }
    }

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

// Obtener productos con filtros, búsqueda y paginación
// Obtener productos con filtros, búsqueda y paginación
router.get('/', async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      genero,
      categoria,
      coleccion,
      busqueda,
      talla
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    if (genero) query.genero = genero;
    if (categoria) query.categoria = categoria;
    if (coleccion) query.coleccion = coleccion;
    if (busqueda) query.nombre = { $regex: busqueda, $options: 'i' };

    // Filtro por talla (stock.{talla} > 0)
    if (talla && ['S', 'M', 'L', 'XL'].includes(talla)) {
      query[`stock.${talla}`] = { $gt: 0 };
    }

    const total = await Producto.countDocuments(query);
    const productos = await Producto.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      productos,
      total,
      totalPages,
      currentPage: page
    });
  } catch (err) {
    console.error('❌ Error en GET /productos:', err);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: err.message });
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

// Actualizar producto
// Actualizar producto
router.put('/:id', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    let {
      nombre,
      descripcion,
      precio,
      categoria,
      coleccion,
      genero,
      stock,
      imagenesActuales
    } = req.body;

    // Asegurarse que sean objetos si vienen como string
    stock = typeof stock === 'string' ? JSON.parse(stock) : stock;
    imagenesActuales = imagenesActuales ? (
      typeof imagenesActuales === 'string' ? JSON.parse(imagenesActuales) : imagenesActuales
    ) : [];

    const nuevasImagenes = [];

    for (const file of req.files || []) {
      const result = await cloudinary.uploader.upload(file.path);
      nuevasImagenes.push({
        url: result.secure_url,
        public_id: result.public_id
      });

      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const imagenesFinales = [...imagenesActuales, ...nuevasImagenes];

    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      {
        nombre,
        descripcion,
        precio,
        categoria,
        coleccion,
        genero,
        stock,
        imagenes: imagenesFinales
      },
      { new: true }
    );

    res.json(productoActualizado);
  } catch (err) {
    console.error('❌ Error al actualizar producto:', err);
    res.status(500).json({
      mensaje: 'Error al actualizar el producto',
      error: err.message
    });
  }
});

// Eliminar producto
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
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import Producto from '../models/Producto.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer con almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'timeless',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ storage });


// Crear producto
router.post('/', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, coleccion, genero, stock, imagenesActuales } = req.body;

    const nuevasImagenes = req.files.map(file => ({
      url: file.path,
      public_id: file.filename || file.public_id
    }));

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


// Obtener productos
router.get('/', async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
});


// Obtener producto por ID
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
router.put('/:id', authMiddleware, upload.array('imagenes'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, coleccion, genero, stock, imagenesActuales } = req.body;

    const nuevasImagenes = req.files.map(file => ({
      url: file.path,
      public_id: file.filename || file.public_id
    }));

    const imagenesFinales = [
      ...(JSON.parse(imagenesActuales) || []),
      ...nuevasImagenes
    ];

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


// Eliminar producto
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    // Eliminar imágenes de Cloudinary
    for (const img of producto.imagenes) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: err.message });
  }
});


// Ruta para obtener opciones únicas de categoría y colección
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

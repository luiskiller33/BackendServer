import express from 'express';
import multer from 'multer';
import Producto from '../models/Producto.js';
import auth from '../middleware/authMiddleware.js';
import { cloudinary } from '../config/cloudinary.js'; // ✅ Corrección aquí
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// ✅ Almacenamiento en Cloudinary (usando config centralizada)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'productos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, crop: 'limit' }]
  }
});

const upload = multer({ storage });

// Crear producto
router.post('/', auth, upload.array('imagenes'), async (req, res) => {
  try {
    const imagenes = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));
    const stock = typeof req.body.stock === 'string' ? JSON.parse(req.body.stock) : req.body.stock;

    const nuevoProducto = new Producto({
      ...req.body,
      imagenes,
      precio: parseFloat(req.body.precio),
      stock
    });

    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obtener productos con filtros y paginación
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      categoria,
      coleccion,
      genero,
      talla,
      busqueda,
      sort = 'recientes'
    } = req.query;

    const filtros = {};
    if (busqueda) filtros.nombre = { $regex: busqueda, $options: 'i' };
    if (categoria) filtros.categoria = categoria;
    if (coleccion) filtros.coleccion = coleccion;
    if (genero) filtros.genero = genero;
    if (talla && talla !== 'Todas') filtros[`stock.${talla}`] = { $gt: 0 };

    let orden = { createdAt: -1 };
    if (sort === 'precio_asc') orden = { precio: 1 };
    else if (sort === 'precio_desc') orden = { precio: -1 };

    const total = await Producto.countDocuments(filtros);
    const productos = await Producto.find(filtros)
      .sort(orden)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      productos,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener producto individual
router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Editar producto
router.put('/:id', auth, upload.array('imagenes'), async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const nuevasImagenes = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    const imagenesActuales = JSON.parse(req.body.imagenesActuales || '[]');

    producto.nombre = req.body.nombre;
    producto.descripcion = req.body.descripcion;
    producto.precio = parseFloat(req.body.precio);
    producto.categoria = req.body.categoria;
    producto.coleccion = req.body.coleccion;
    producto.genero = req.body.genero;
    producto.stock = typeof req.body.stock === 'string' ? JSON.parse(req.body.stock) : req.body.stock;
    producto.imagenes = [...imagenesActuales, ...nuevasImagenes];

    await producto.save();
    res.json(producto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar producto y sus imágenes de Cloudinary
router.delete('/:id', auth, async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    for (const img of producto.imagenes) {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    res.json({ msg: 'Producto e imágenes eliminados correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// Obtener opciones únicas
router.get('/opciones/unicas', async (req, res) => {
  try {
    const productos = await Producto.find();

    const normalizar = (texto) => {
      if (!texto) return '';
      const limpio = texto.trim().toLowerCase();
      return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    };

    const categorias = [...new Set(productos.map(p => normalizar(p.categoria)).filter(Boolean))];
    const colecciones = [...new Set(productos.map(p => normalizar(p.coleccion)).filter(Boolean))];
    const generos = [...new Set(productos.map(p => normalizar(p.genero)).filter(Boolean))];

    res.json({ categorias, colecciones, generos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener opciones' });
  }
});

export default router;

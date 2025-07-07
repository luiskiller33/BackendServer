import express from 'express';
import multer from 'multer';
import Producto from '../models/Producto.js';
import auth from '../middleware/authMiddleware.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configurar multer para guardar imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Crear producto (requiere login)
router.post('/', auth, upload.array('imagenes'), async (req, res) => {
  try {
    const rutasImagenes = req.files.map(file => '/uploads/' + file.filename);
    const stock = typeof req.body.stock === 'string' ? JSON.parse(req.body.stock) : req.body.stock;
    const nuevoProducto = new Producto({
      ...req.body,
      imagenes: rutasImagenes,
      precio: parseFloat(req.body.precio),
      stock
    });
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obtener productos con paginación y filtros
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

    if (busqueda) {
      filtros.nombre = { $regex: busqueda, $options: 'i' };
    }
    if (categoria) filtros.categoria = categoria;
    if (coleccion) filtros.coleccion = coleccion;
    if (genero) filtros.genero = genero;

    if (talla && talla !== 'Todas') {
      filtros[`stock.${talla}`] = { $gt: 0 };
    }

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

    const nuevasImagenes = req.files.map(file => '/uploads/' + file.filename);
    const imagenesActuales = JSON.parse(req.body.imagenesActuales || '[]');

    producto.imagenes.forEach(img => {
      if (!imagenesActuales.includes(img)) {
        const pathImg = 'backend' + img;
        if (fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
      }
    });

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

// Eliminar producto
router.delete('/:id', auth, async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    producto.imagenes.forEach(img => {
      const pathImg = 'backend' + img;
      if (fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
    });

    res.json({ msg: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// Obtener categorías, colecciones y géneros únicos con capitalización
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

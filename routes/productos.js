import express from 'express';
import Producto from '../models/Producto.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const router = express.Router();

// Crear producto
router.post('/', authMiddleware, upload.any(), async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      coleccion,
      genero,
      stock,
      colores
    } = req.body;

    const parsedStock = JSON.parse(stock || '{}');
    const parsedColores = colores ? JSON.parse(colores) : [];

    const archivosPorCampo = {};
    for (const file of req.files || []) {
      if (!archivosPorCampo[file.fieldname]) {
        archivosPorCampo[file.fieldname] = [];
      }
      archivosPorCampo[file.fieldname].push(file);
    }

    const imagenesGenerales = [];
    if (parsedColores.length === 0 && archivosPorCampo['imagenes']) {
      const resultados = await Promise.all(archivosPorCampo['imagenes'].map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path);
        fs.existsSync(file.path) && fs.unlinkSync(file.path);
        return {
          url: result.secure_url,
          public_id: result.public_id
        };
      }));
      imagenesGenerales.push(...resultados);
    }

    const coloresConImagenes = await Promise.all(parsedColores.map(async (color, i) => {
      const campo = `imagenesColor${i}`;
      const archivos = archivosPorCampo[campo] || [];
      const imagenes = await Promise.all(archivos.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path);
        fs.existsSync(file.path) && fs.unlinkSync(file.path);
        return {
          url: result.secure_url,
          public_id: result.public_id
        };
      }));
      return {
        nombre: color.nombre.trim(),
        codigoHex: color.codigoHex,
        imagenes
      };
    }));

    const nuevoProducto = new Producto({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio,
      categoria: categoria.trim(),
      coleccion: coleccion.trim(),
      genero,
      stock: parsedStock,
      imagenes: imagenesGenerales,
      colores: coloresConImagenes
    });

    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (err) {
    console.error('❌ Error al crear producto:', err);
    res.status(500).json({ mensaje: 'Error al crear el producto', error: err.message });
  }
});

// Obtener productos con filtros, búsqueda y paginación
// En tu archivo de rutas de productos
router.get('/', async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      genero,
      categoria,
      coleccion,
      busqueda,
      talla,
      ordenFecha,
      stockMin,
      stockMax
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    // Manejar filtros múltiples
    if (genero) {
      const generos = genero.split(',');
      query.genero = { $in: generos };
    }
    
    if (categoria) {
      const categorias = categoria.split(',');
      query.categoria = { $in: categorias };
    }
    
    if (coleccion) {
      const colecciones = coleccion.split(',');
      query.coleccion = { $in: colecciones };
    }

    if (busqueda) query.nombre = { $regex: busqueda, $options: 'i' };

    // Manejar múltiples tallas
    if (talla) {
      const tallas = talla.split(',');
      const tallaQueries = tallas.map(t => ({ [`stock.${t}`]: { $gt: 0 } }));
      query.$or = tallaQueries;
    }

    if (stockMin !== undefined || stockMax !== undefined) {
      const min = Number(stockMin) || 0;
      const max = Number(stockMax) || Number.MAX_SAFE_INTEGER;
      query.$expr = {
        $and: [
          { $lte: [{ $sum: ['$stock.S', '$stock.M', '$stock.L', '$stock.XL'] }, max] },
          { $gte: [{ $sum: ['$stock.S', '$stock.M', '$stock.L', '$stock.XL'] }, min] }
        ]
      };
    }

    let sortCriteria = {};
    if (ordenFecha === 'asc') sortCriteria.createdAt = 1;
    else if (ordenFecha === 'desc') sortCriteria.createdAt = -1;
    else sortCriteria.updatedAt = -1;

    const total = await Producto.countDocuments(query);
    const productos = await Producto.find(query)
      .sort(sortCriteria)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    res.json({ productos, total, totalPages, currentPage: page });
  } catch (err) {
    console.error('❌ Error en GET /productos:', err);
    res.status(500).json({ mensaje: 'Error al obtener productos', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener producto' });
  }
});

// ✅ Actualizar producto con soporte de colores y múltiples imágenes
router.put('/:id', authMiddleware, upload.any(), async (req, res) => {
  try {
    let {
      nombre,
      descripcion,
      precio,
      categoria,
      coleccion,
      genero,
      stock,
      colores,
      imagenesActuales
    } = req.body;

    stock = typeof stock === 'string' ? JSON.parse(stock) : stock;
    colores = colores ? JSON.parse(colores) : [];
    imagenesActuales = imagenesActuales ? JSON.parse(imagenesActuales) : [];

    const archivosPorCampo = {};
    for (const file of req.files || []) {
      if (!archivosPorCampo[file.fieldname]) {
        archivosPorCampo[file.fieldname] = [];
      }
      archivosPorCampo[file.fieldname].push(file);
    }

    const nuevasImagenes = [];
    if (colores.length === 0 && archivosPorCampo['imagenes']) {
      const resultados = await Promise.all(archivosPorCampo['imagenes'].map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path);
        fs.existsSync(file.path) && fs.unlinkSync(file.path);
        return {
          url: result.secure_url,
          public_id: result.public_id
        };
      }));
      nuevasImagenes.push(...resultados);
    }

    const imagenesFinales = [...imagenesActuales, ...nuevasImagenes];

    const coloresFinales = await Promise.all(colores.map(async (color, i) => {
      const campo = `imagenesColor${i}`;
      const archivos = archivosPorCampo[campo] || [];
      const nuevas = await Promise.all(archivos.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path);
        fs.existsSync(file.path) && fs.unlinkSync(file.path);
        return {
          url: result.secure_url,
          public_id: result.public_id
        };
      }));

      const actuales = color.imagenesActuales ? JSON.parse(color.imagenesActuales) : [];

      return {
        nombre: color.nombre.trim(),
        codigoHex: color.codigoHex,
        imagenes: [...actuales, ...nuevas]
      };
    }));

    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        categoria: categoria.trim(),
        coleccion: coleccion.trim(),
        genero,
        stock,
        imagenes: imagenesFinales,
        colores: coloresFinales
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

    for (const img of producto.imagenes || []) {
      await cloudinary.uploader.destroy(img.public_id);
    }

    for (const color of producto.colores || []) {
      for (const img of color.imagenes || []) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    await producto.deleteOne();
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al eliminar producto', error: err.message });
  }
});

// Opciones únicas
router.get('/opciones/unicas', async (req, res) => {
  try {
    const productos = await Producto.find({}, 'categoria coleccion genero');
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
    const colecciones = [...new Set(productos.map(p => p.coleccion).filter(Boolean))];
    const generos = [...new Set(productos.map(p => p.genero).filter(Boolean))];
    res.json({ categorias, colecciones, generos });
  } catch (err) {
    console.error('❌ Error en /opciones/unicas:', err);
    res.status(500).json({ mensaje: 'Error al obtener opciones únicas' });
  }
});

// Reordenar productos
router.patch('/reordenar', authMiddleware, async (req, res) => {
  try {
    const { productos } = req.body;
    const actualizaciones = productos.map(({ id, orden }) =>
      Producto.findByIdAndUpdate(id, { orden })
    );
    await Promise.all(actualizaciones);
    res.status(200).json({ mensaje: 'Orden actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error en PATCH /productos/reordenar:', err);
    res.status(500).json({ mensaje: 'Error al actualizar el orden', error: err.message });
  }
});

// Obtener todos los productos sin paginación
router.get('/todos', async (req, res) => {
  try {
    const productos = await Producto.find({}).lean();
    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener todos los productos:', error);
    res.status(500).json({ mensaje: 'Error del servidor al obtener los productos' });
  }
});
// Opciones filtradas según filtros aplicados
router.get('/opciones/filtradas', async (req, res) => {
  try {
    const { categoria, genero } = req.query;
    
    // Construir query base
    const query = {};
    
    if (categoria) {
      const categorias = categoria.split(',');
      query.categoria = { $in: categorias };
    }
    
    if (genero) {
      const generos = genero.split(',');
      query.genero = { $in: generos };
    }

    // Obtener productos que cumplen los filtros
    const productos = await Producto.find(query, 'categoria coleccion genero stock');
    
    // Extraer opciones únicas de los productos filtrados
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
    const colecciones = [...new Set(productos.map(p => p.coleccion).filter(Boolean))];
    const generos = [...new Set(productos.map(p => p.genero).filter(Boolean))];
    
    // Extraer tallas disponibles de los productos filtrados
    const tallasSet = new Set();
    productos.forEach(producto => {
      if (producto.stock) {
        Object.keys(producto.stock).forEach(talla => {
          if (producto.stock[talla] > 0) {
            tallasSet.add(talla);
          }
        });
      }
    });
    const tallas = Array.from(tallasSet);
    
    res.json({ categorias, colecciones, generos, tallas });
  } catch (err) {
    console.error('❌ Error en /opciones/filtradas:', err);
    res.status(500).json({ mensaje: 'Error al obtener opciones filtradas' });
  }
});
export default router;

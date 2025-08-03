import express from 'express';
import Producto from '../models/Producto.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { Parser } from 'json2csv';

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


router.post('/exportar', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron IDs para exportar' });
    }

    const productos = await Producto.find({ _id: { $in: ids } }).lean();

    const fields = [
      { label: 'Nombre', value: 'nombre' },
      { label: 'Precio', value: 'precio' },
      { label: 'Género', value: 'genero' },
      { label: 'Categoría', value: 'categoria' },
      { label: 'Colección', value: 'coleccion' },
      { label: 'Estado', value: 'estado' },
      { label: 'Stock S', value: row => row.stock?.S || 0 },
      { label: 'Stock M', value: row => row.stock?.M || 0 },
      { label: 'Stock L', value: row => row.stock?.L || 0 },
      { label: 'Stock XL', value: row => row.stock?.XL || 0 },
      { label: 'Total', value: row => (row.stock?.S || 0) + (row.stock?.M || 0) + (row.stock?.L || 0) + (row.stock?.XL || 0) }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(productos);

    res.header('Content-Type', 'text/csv');
    res.attachment('productos_seleccionados.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar productos seleccionados:', error);
    res.status(500).json({ mensaje: 'Error al exportar productos seleccionados' });
  }
});
// Obtener productos con filtros, búsqueda y paginación
// En tu archivo de rutas de productos
// Obtener productos con filtros, búsqueda y paginación
router.get('/', async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      estado = 'publicado',
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

    const query = { estado };

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

    if (busqueda) {
      query.nombre = { $regex: busqueda, $options: 'i' };
    }

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

    // ✅ ORDENAMIENTO ESTABLE PARA PAGINACIÓN FIABLE
    let sortCriteria = {};
    if (ordenFecha === 'asc') sortCriteria.createdAt = 1;
    else if (ordenFecha === 'desc') sortCriteria.createdAt = -1;
    else sortCriteria = { createdAt: -1 };
 // ✅ aquí está el cambio importante

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

// Agregar este endpoint al archivo existente
router.patch('/:id/campo', authMiddleware, async (req, res) => {
  try {
    const { campo, valor } = req.body;
    
    // Validar campos permitidos
    const camposPermitidos = ['categoria', 'coleccion', 'genero'];
    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ mensaje: 'Campo no permitido para edición rápida' });
    }
    
    const updateData = { [campo]: valor.trim() };
    
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar campo:', error);
    res.status(500).json({ mensaje: 'Error al actualizar campo' });
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

// Actualizar stock
router.patch('/:id/stock', authMiddleware, async (req, res) => {
  try {
    const { stock } = req.body;
    
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ mensaje: 'Error al actualizar stock' });
  }
});

// Actualizar estado
router.patch('/:id/estado', authMiddleware, async (req, res) => {
  try {
    const { estado } = req.body;
    
    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ mensaje: 'Error al actualizar estado' });
  }
});

// Acciones masivas
router.patch('/masivo', authMiddleware, async (req, res) => {
  try {
    const { ids, campo, valor } = req.body;

    if (!campo || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ mensaje: 'Datos inválidos para acción masiva' });
    }

    const updateData = { [campo]: valor };

    // ✅ Si cambia el estado, actualiza también updatedAt manualmente
    if (campo === 'estado') {
      updateData.updatedAt = new Date();
    }

    const resultado = await Producto.updateMany(
      { _id: { $in: ids } },
      updateData
    );

    // ✅ Si se están publicando productos, reordenarlos automáticamente
    if (campo === 'estado' && valor === 'publicado') {
      const productos = await Producto.find({ _id: { $in: ids } }).sort({ updatedAt: -1 });
      const baseOrden = Date.now(); // puedes usar otro criterio

      const actualizaciones = productos.map((producto, index) =>
        Producto.findByIdAndUpdate(producto._id, { orden: baseOrden + index })
      );

      await Promise.all(actualizaciones);
    }

    res.json({
      mensaje: `${resultado.modifiedCount} productos actualizados`,
      modificados: resultado.modifiedCount
    });
  } catch (error) {
    console.error('Error en acción masiva:', error);
    res.status(500).json({ mensaje: 'Error en acción masiva' });
  }
});

// Eliminar masivo
router.delete('/masivo', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    
    const resultado = await Producto.deleteMany({
      _id: { $in: ids }
    });
    
    res.json({ 
      mensaje: `${resultado.deletedCount} productos eliminados`,
      eliminados: resultado.deletedCount 
    });
  } catch (error) {
    console.error('Error al eliminar productos:', error);
    res.status(500).json({ mensaje: 'Error al eliminar productos' });
  }
});
 // Asegúrate de instalar json2csv: npm i json2csv

// Exportar productos a CSV
router.get('/exportar', authMiddleware, async (req, res) => {
  try {
    const productos = await Producto.find({}).lean();

    // Define los campos que quieres exportar
    const fields = [
      { label: 'Nombre', value: 'nombre' },
      { label: 'Precio', value: 'precio' },
      { label: 'Género', value: 'genero' },
      { label: 'Categoría', value: 'categoria' },
      { label: 'Colección', value: 'coleccion' },
      { label: 'Estado', value: 'estado' },
      { label: 'Stock S', value: row => row.stock?.S || 0 },
      { label: 'Stock M', value: row => row.stock?.M || 0 },
      { label: 'Stock L', value: row => row.stock?.L || 0 },
      { label: 'Stock XL', value: row => row.stock?.XL || 0 },
      { label: 'Total', value: row => (row.stock?.S || 0) + (row.stock?.M || 0) + (row.stock?.L || 0) + (row.stock?.XL || 0) }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(productos);

    res.header('Content-Type', 'text/csv');
    res.attachment('productos.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar productos:', error);
    res.status(500).json({ mensaje: 'Error al exportar productos' });
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

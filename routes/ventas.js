import express from 'express';
import Venta from '../models/Venta.js';
import Producto from '../models/Producto.js';

const router = express.Router();

// 🔧 Función de normalización de texto
const normalizarTexto = (texto) =>
  typeof texto === 'string' ? texto.trim().toLowerCase() : null;

// 🔹 Crear venta
router.post('/', async (req, res) => {
  try {
    const { 
      cliente, 
      nombreCliente, 
      correo,           // ✅ Nuevo
      telefono,         // ✅ Nuevo
      direccion,        // ✅ Nuevo
      ubicacion,        // ✅ Nuevo
      productos,
      incluyeIVA        // ✅ Nuevo
    } = req.body;

    let total = 0;
    const productosProcesados = [];

    for (const item of productos) {
      const producto = await Producto.findById(item.productoId);
      if (!producto) continue;

      const precioUnitario = item.precioUnitario;
      const subtotal = precioUnitario * item.cantidad;
      total += subtotal;

      // ✅ Descontar stock por talla
      if (producto.stock && producto.stock[item.talla] != null) {
        producto.stock[item.talla] = Math.max(
          0,
          producto.stock[item.talla] - item.cantidad
        );
      }

      await producto.save();

      // ✅ Incluir campos limpios y normalizados + color
      productosProcesados.push({
        productoId: producto._id,
        nombre: producto.nombre?.trim(),
        talla: item.talla,
        color: item.color,                    // ✅ Nuevo
        cantidad: item.cantidad,
        precioUnitario,
        subtotal,
        genero: normalizarTexto(producto.genero),
        categoria: normalizarTexto(producto.categoria),
        coleccion: normalizarTexto(producto.coleccion)
      });
    }

    const venta = new Venta({
      cliente,
      nombreCliente: nombreCliente?.trim() || 'Cliente anónimo',
      correo: correo?.trim(),               // ✅ Nuevo
      telefono: telefono?.trim(),           // ✅ Nuevo
      direccion: direccion?.trim(),         // ✅ Nuevo
      ubicacion: ubicacion?.trim(),         // ✅ Nuevo
      productos: productosProcesados,
      total,
      incluyeIVA: incluyeIVA || false       // ✅ Nuevo
    });

    await venta.save();

    res.status(201).json({ message: 'Venta registrada con éxito', venta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

// 🔹 Obtener todas las ventas
router.get('/', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha: -1 });
    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// 🔹 Eliminar una venta
router.delete('/:id', async (req, res) => {
  try {
    const venta = await Venta.findByIdAndDelete(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json({ message: 'Venta eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la venta' });
  }
});

export default router;
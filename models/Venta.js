import mongoose from 'mongoose';

const productoVendidoSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre: String,
  talla: String,
  color: String,        // ✅ NUEVO - para guardar el color del producto
  cantidad: Number,
  precioUnitario: Number,
  subtotal: Number,
  genero: String,
  categoria: String,
  coleccion: String
});

const ventaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: false },
  nombreCliente: String,
  correo: String,       // ✅ NUEVO - correo del cliente
  telefono: String,     // ✅ NUEVO - teléfono del cliente
  direccion: String,    // ✅ NUEVO - dirección de entrega
  ubicacion: String,    // ✅ NUEVO - ubicación/link de maps
  productos: [productoVendidoSchema],
  total: Number,
  incluyeIVA: Boolean,
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model('Venta', ventaSchema);
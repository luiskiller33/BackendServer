import mongoose from 'mongoose';

const productoVendidoSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre: String,
  talla: String,
  cantidad: Number,
  precioUnitario: Number,
  subtotal: Number,
  genero: String,       // ✅ nuevo campo
  categoria: String,    // ✅ nuevo campo
  coleccion: String     // ✅ nuevo campo
});

const ventaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: false },
  nombreCliente: String,
  productos: [productoVendidoSchema],
  total: Number,
  incluyeIVA: Boolean,
  fecha: { type: Date, default: Date.now }
});

export default mongoose.model('Venta', ventaSchema);

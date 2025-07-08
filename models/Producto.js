import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
  },
  descripcion: {
    type: String,
    trim: true
  },
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0.01, 'El precio debe ser mayor a 0']
  },
  imagenes: {
    type: [
      {
        url: {
          type: String,
          required: true
        },
        public_id: {
          type: String,
          required: true
        }
      }
    ],
    default: []
  },
  genero: {
    type: String,
    enum: ['Hombre', 'Mujer', 'Unisex'],
    default: 'Unisex'
  },
  categoria: {
    type: String,
    trim: true
  },
  coleccion: {
    type: String,
    trim: true
  },
  stock: {
    S: { type: Number, default: 0, min: 0 },
    M: { type: Number, default: 0, min: 0 },
    L: { type: Number, default: 0, min: 0 },
    XL: { type: Number, default: 0, min: 0 }
  }
}, { timestamps: true });

// ❌ Eliminado el middleware que bloquea productos con stock 0

export default mongoose.model('Producto', productoSchema);

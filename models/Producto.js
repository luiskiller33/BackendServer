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
        url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],
    default: []
  },
  colores: {
    type: [
      {
        nombre: { type: String, required: true },
        codigoHex: { type: String, required: true },
        imagenes: [
          {
            url: { type: String, required: true },
            public_id: { type: String, required: true }
          }
        ]
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
  },
  estado: {
    type: String,
    enum: ['borrador', 'publicado', 'archivado'],
    default: 'borrador'
  },
  orden: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

productoSchema.index({ nombre: 'text' });
productoSchema.index({ categoria: 1 });
productoSchema.index({ coleccion: 1 });
productoSchema.index({ genero: 1 });
productoSchema.index({ orden: 1 });
productoSchema.index({ createdAt: -1 });
productoSchema.index({ estado: 1 });

// ✅ Índice compuesto para paginación estable
productoSchema.index({ estado: 1, orden: 1, updatedAt: -1, _id: 1 });

export default mongoose.model('Producto', productoSchema);

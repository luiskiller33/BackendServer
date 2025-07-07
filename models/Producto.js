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
    default: [] // 👈 Garantiza que siempre sea un array
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
    S: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} debe ser un número entero'
      }
    },
    M: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} debe ser un número entero'
      }
    },
    L: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} debe ser un número entero'
      }
    },
    XL: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} debe ser un número entero'
      }
    }
  }
}, { timestamps: true });

productoSchema.pre('save', function (next) {
  const totalStock = this.stock.S + this.stock.M + this.stock.L + this.stock.XL;
  if (totalStock <= 0) {
    next(new Error('El producto debe tener al menos una unidad en stock'));
  } else {
    next();
  }
});

export default mongoose.model('Producto', productoSchema);
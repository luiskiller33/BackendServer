import mongoose from 'mongoose';

/**
 * Modelo de Producto para la base de datos
 * Representa los artículos disponibles en la tienda
 */
const productoSchema = new mongoose.Schema({
  /**
   * Nombre del producto (obligatorio)
   */
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
  },

  /**
   * Descripción del producto (opcional)
   */
  descripcion: {
    type: String,
    trim: true
  },

  /**
   * Precio del producto (obligatorio y debe ser > 0)
   */
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0.01, 'El precio debe ser mayor a 0']
  },

  /**
   * Rutas de las imágenes del producto (obligatorio al menos una)
   * ¡Descomenta si quieres requerir al menos una imagen!
   */
  imagenes: {
    type: [String],
    // validate: [val => val.length > 0, 'Al menos una imagen es obligatoria']
  },

  /**
   * Género del producto (Hombre, Mujer, Unisex) - default: Unisex
   */
  genero: {
    type: String,
    enum: {
      values: ['Hombre', 'Mujer', 'Unisex'],
      message: '{VALUE} no es un género válido'
    },
    default: 'Unisex'
  },

  /**
   * Categoría del producto (ej: Camisetas, Pantalones, etc.)
   */
  categoria: {
    type: String,
    trim: true
  },

  /**
   * Colección a la que pertenece el producto (ej: Verano 2025)
   */
  coleccion: {
    type: String,
    trim: true
  },

  /**
   * Stock por talla
   */
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

/**
 * Middleware pre-save para validar que al menos haya una talla disponible
 */
productoSchema.pre('save', function(next) {
  const totalStock = this.stock.S + this.stock.M + this.stock.L + this.stock.XL;
  if (totalStock <= 0) {
    next(new Error('El producto debe tener al menos una unidad en stock'));
  } else {
    next();
  }
});

export default mongoose.model('Producto', productoSchema);

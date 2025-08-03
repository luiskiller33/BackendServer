// actualizarOrden.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Producto from './models/Producto.js'; // Ajusta la ruta si está en otra carpeta

async function actualizarOrden() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Conectado a la base de datos');

    const productos = await Producto.find({}).sort({ createdAt: 1 });

    for (let i = 0; i < productos.length; i++) {
      productos[i].orden = i + 1;
      await productos[i].save();
      console.log(`✅ Producto ${productos[i].nombre} → orden: ${i + 1}`);
    }

    console.log('🎉 Todos los productos fueron actualizados correctamente');
    process.exit();
  } catch (err) {
    console.error('❌ Error al actualizar orden:', err);
    process.exit(1);
  }
}

actualizarOrden();

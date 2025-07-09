import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import productosRoutes from './routes/productos.js';
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import ventasRoutes from './routes/ventas.js';
import guiasRoutes from './routes/guias.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración CORS para React local
app.use(cors());

app.use(express.json());

// Archivos estáticos (solo si sigues usando /uploads localmente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/guiatallas', guiasRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Conectado a MongoDB');
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
}).catch(err => console.error('❌ Error al conectar a MongoDB:', err));

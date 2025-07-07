import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String },
  telefono: { type: String },
  direccion: { type: String },
  notas: { type: String }
}, {
  timestamps: true
});

export default mongoose.model('Cliente', clienteSchema);

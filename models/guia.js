// models/guia.js
import mongoose from 'mongoose';

const campoSchema = new mongoose.Schema({
  nombre: { type: String, required: true }
}, { _id: false });

const valoresPorTallaSchema = new mongoose.Schema({
  S: { type: mongoose.Schema.Types.Mixed },
  M: { type: mongoose.Schema.Types.Mixed },
  L: { type: mongoose.Schema.Types.Mixed },
  XL: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const guiaSchema = new mongoose.Schema({
  categoria: { type: String, required: true },
  coleccion: { type: String, required: true },
  campos: [campoSchema],
  valores: valoresPorTallaSchema,
  descripcion: { type: String }
}, { timestamps: true });

guiaSchema.index({ categoria: 1, coleccion: 1 }, { unique: true });

export default mongoose.model('Guia', guiaSchema);

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new Usuario({ nombre, email, password: hashed });
    await newUser.save();
    res.status(201).json({ message: 'Usuario creado' });
  } catch (err) {
    res.status(400).json({ error: 'No se pudo crear el usuario' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await Usuario.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '3h'
  });

  res.json({ token, user: { nombre: user.nombre, email: user.email } });
});

export default router;

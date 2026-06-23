# ⚙️ Backend - Timeless(Refactorizado con codex)

Este es el **backend** de la tienda de ropa **Timeless**, encargado de la API REST, la base de datos, autenticación y **notificaciones por correo** al empresario cuando se registra una venta/pedido.

---

## 🚀 Tecnologías utilizadas
- **Node.js + Express** 🖥️ (API REST)
- **MongoDB + Mongoose** 🍃 (Base de datos)
- **Cloudinary** ☁️ (Imágenes)
- **JWT** 🔐 (Auth de administradores)
- **Multer** 📂 (Uploads opcionales)
- **CORS, Dotenv** 🌐🔑 (Conexión & env)
- **Nodemailer** ✉️ (Notificaciones por correo)
  - *Opcional:* **Resend** / **SMTP propio** / **Gmail (App Password)**

---

## 📦 Funcionalidades principales
✅ CRUD de productos (imágenes, tallas, colores, categorías, colecciones, estado de publicación)  
✅ Gestión de clientes  
✅ Registro de ventas con descuento automático de stock  
✅ Historial con filtros y exportación  
✅ Dashboard de reportes  
✅ **Notificaciones por correo al empresario**:
- **Nuevo pedido/venta creada** (detalles completos)
- *Opcional:* alerta de **bajo stock**
- *Opcional:* **resumen diario** de ventas

cd backend-timeless
npm install

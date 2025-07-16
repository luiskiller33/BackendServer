import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Configurar el transportador de correo (CORREGIDO: createTransport, no createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail', // Cambia por 'outlook' si usas Outlook
  auth: {
    user: process.env.EMAIL_USER, // tu correo
    pass: process.env.EMAIL_PASS  // tu contraseña de aplicación
  }
});

// Endpoint para enviar correos de notificación de pedidos
router.post('/enviar-correos-pedido', async (req, res) => {
  try {
    const { datosVenta, mensajeWhatsApp, total } = req.body;
    
    // 🔥 AQUÍ PONES TUS DOS CORREOS REALES
    const correosNotificacion = [
      'a21203109@alumnos.uady.mx',  // ← CAMBIA ESTE
      'contactimelessbrand@gmail.com',
      'diegosiqyesss@gmail.com'
       
    ];

    // Crear el contenido del correo
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h2 style="color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 15px; margin-top: 0;">
            🛍️ Nuevo Pedido - Timeless
          </h2>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #555; margin-top: 0;">👤 Información del Cliente:</h3>
            <p><strong>Nombre:</strong> ${datosVenta.nombreCliente}</p>
            <p><strong>📧 Correo:</strong> ${datosVenta.correo}</p>
            <p><strong>📱 Teléfono:</strong> ${datosVenta.telefono}</p>
            <p><strong>📍 Dirección:</strong> ${datosVenta.direccion}</p>
            ${datosVenta.ubicacion ? `<p><strong>🗺️ Ubicación:</strong> <a href="${datosVenta.ubicacion}" target="_blank" style="color: #2196F3;">Ver en Google Maps</a></p>` : ''}
          </div>

          <div style="background-color: #fff; border: 2px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #555; margin-top: 0;">🛒 Productos Pedidos:</h3>
            ${datosVenta.productos.map(producto => `
              <div style="border-bottom: 1px solid #eee; padding: 15px 0; margin-bottom: 10px;">
                <h4 style="color: #333; margin: 0 0 10px 0;">📦 ${producto.nombre}</h4>
                <p style="margin: 5px 0; color: #666;">
                  <strong>Talla:</strong> ${producto.talla} 
                  ${producto.color ? `| <strong>Color:</strong> ${producto.color}` : ''}
                </p>
                <p style="margin: 5px 0; color: #666;">
                  <strong>Cantidad:</strong> ${producto.cantidad} | 
                  <strong>Precio unitario:</strong> $${producto.precioUnitario.toLocaleString()}
                </p>
                <p style="margin: 5px 0; color: #4CAF50; font-weight: bold;">
                  💰 Subtotal: $${(producto.precioUnitario * producto.cantidad).toLocaleString()}
                </p>
              </div>
            `).join('')}
          </div>

          <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px;">💵 Total del Pedido: $${total}</h3>
          </div>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h4 style="color: #1976d2; margin-top: 0;">💬 Mensaje para WhatsApp:</h4>
            <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px; margin: 0; color: #333;">${mensajeWhatsApp}</pre>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              🤖 Este correo fue generado automáticamente desde el sistema de Timeless
              <br>
              📅 Fecha: ${new Date().toLocaleString('es-MX', { 
                timeZone: 'America/Mexico_City',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
        </div>
      </div>
    `;

    // Enviar correo a cada dirección de notificación
    const promesasEnvio = correosNotificacion.map(correo => {
      return transporter.sendMail({
        from: `"Timeless - Sistema de Pedidos" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: `🛍️ Nuevo Pedido - ${datosVenta.nombreCliente} - $${total}`,
        html: htmlContent
      });
    });

    // Esperar a que se envíen todos los correos
    await Promise.all(promesasEnvio);

    console.log(`✅ Correos enviados exitosamente a: ${correosNotificacion.join(', ')}`);

    res.status(200).json({ 
      success: true, 
      message: 'Correos de notificación enviados correctamente',
      correosEnviados: correosNotificacion.length
    });

  } catch (error) {
    console.error('❌ Error al enviar correos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al enviar correos de notificación',
      error: error.message 
    });
  }
});

export default router;
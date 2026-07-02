require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializar cliente de WhatsApp
// LocalAuth guarda la sesión localmente para que no tengas que escanear el QR cada vez
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', async (qr) => {
    // Save QR code as image locally
    const qrPath = './qr.png';
    try {
        await qrcode.toFile(qrPath, qr);
        console.log('¡QR Guardado en', qrPath, '!');
    } catch (err) {
        console.error('Error guardando QR:', err);
    }
});

client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado y listo para enviar mensajes!');
    isReady = true;
    checkPendingMessages();
});

client.on('disconnected', (reason) => {
    console.log('Bot desconectado:', reason);
    isReady = false;
});

client.on('auth_failure', msg => {
    console.error('Error de autenticación:', msg);
});

// Iniciar sesión
client.initialize();

// Función para revisar y enviar mensajes pendientes en la cola
async function checkPendingMessages() {
    if (!isReady) return;

    try {
        // Buscar mensajes pendientes
        const { data: messages, error } = await supabase
            .from('whatsapp_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10); // Procesar en lotes de 10

        if (error) {
            console.error('Error consultando mensajes:', error);
            return;
        }

        for (const msg of messages) {
            // Marcar como "procesando"
            await supabase
                .from('whatsapp_queue')
                .update({ status: 'processing', updated_at: new Date() })
                .eq('id', msg.id);

            try {
                // Formatear número (WhatsApp Web JS requiere el formato de número internacional seguido de @c.us)
                // Se asume que el número viene de El Salvador (+503) si no tiene código de país, pero mejor limpiar todo.
                let cleanNumber = msg.phone_number.replace(/\D/g, '');
                
                // Si el número tiene 8 dígitos, asumimos que es de El Salvador y le agregamos el 503
                if (cleanNumber.length === 8) {
                    cleanNumber = '503' + cleanNumber;
                }

                const chatId = `${cleanNumber}@c.us`;

                // Enviar mensaje
                await client.sendMessage(chatId, msg.message_body);
                console.log(`Mensaje enviado a ${cleanNumber} (ID: ${msg.id})`);

                // Marcar como completado
                await supabase
                    .from('whatsapp_queue')
                    .update({ status: 'sent', updated_at: new Date() })
                    .eq('id', msg.id);

            } catch (sendError) {
                console.error(`Error enviando mensaje ID ${msg.id}:`, sendError);
                // Marcar como fallido
                await supabase
                    .from('whatsapp_queue')
                    .update({ 
                        status: 'failed', 
                        error_message: sendError.message,
                        updated_at: new Date() 
                    })
                    .eq('id', msg.id);
            }
        }
    } catch (err) {
        console.error('Error en el proceso de cola:', err);
    }
}

// Configurar Suscripción en Tiempo Real de Supabase
supabase
  .channel('whatsapp-queue-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'whatsapp_queue',
      filter: 'status=eq.pending'
    },
    (payload) => {
      console.log('¡Nuevo mensaje detectado en la cola!', payload.new.id);
      checkPendingMessages();
    }
  )
  .subscribe();

// Opcional: Revisión periódica de respaldo cada minuto por si la conexión de realtime falló
setInterval(checkPendingMessages, 60 * 1000);

// ==========================================
// SERVIDOR WEB PARA MOSTRAR EL QR EN LA NUBE
// ==========================================
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos (qr.png y qr.html)
app.use(express.static(__dirname));

// Ruta principal te redirige a ver el QR
app.get('/', (req, res) => {
    if (isReady) {
        res.send('<h1>✅ Bot Conectado y Corriendo</h1><p>El bot de WhatsApp ya está vinculado. No necesitas escanear nada.</p>');
    } else {
        res.sendFile(path.join(__dirname, 'qr.html'));
    }
});

// Ruta de estado para que la nube (Railway/Render) sepa que estamos vivos
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor web iniciado en el puerto ${PORT}`);
    console.log(`➡️  Para vincular tu WhatsApp, entra a la URL web cuando lo subas a la nube.`);
});

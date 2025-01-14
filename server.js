const fastify = require("fastify")({ logger: true });
const fetch = require("node-fetch"); // Para Expo Push API
const admin = require("firebase-admin"); // Para Firebase

// Configuração do Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Endpoint para registrar dispositivo
fastify.post("/register-device", async (request, reply) => {
  const { token } = request.body;

  if (!token) {
    return reply.status(400).send({ error: "Token não fornecido" });
  }

  const deviceTokens = []; // Simulação de armazenamento
  deviceTokens.push(token);

  reply.send({ success: true, tokens: deviceTokens });
});

// Endpoint para enviar notificações
fastify.post("/send-notification", async (request, reply) => {
  const { token, message, notificationType } = request.body;

  if (!token || !message || !notificationType) {
    return reply.status(400).send({
      error: "Campos obrigatórios: token, message, notificationType",
    });
  }

  const notificationPayload = {
    type: "success",
    message: "New notification received!",
    data: {
      id: Date.now(),
      message: message,
      notificationType: notificationType,
      createdAt: new Date().toISOString(),
    },
  };

  try {
    if (token.startsWith("ExponentPushToken")) {
      // Enviar via Expo Push API
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST", // Define o método HTTP como POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title: "Notificação",
          body: message,
          data: notificationPayload,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        reply.send({ success: true, result });
      } else {
        reply.status(500).send({ success: false, error: result });
      }
    } else {
      // Enviar via Firebase Cloud Messaging
      const messageToSend = {
        notification: {
          title: "Notificação",
          body: message,
        },
        data: notificationPayload,
        token: token,
      };

      const response = await admin.messaging().send(messageToSend);
      reply.send({ success: true, response, notificationPayload });
    }
  } catch (error) {
    fastify.log.error(error);
    reply.status(500).send({ success: false, error: error.message });
  }
});

// Inicializar o servidor
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    fastify.log.info(`Servidor rodando em http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

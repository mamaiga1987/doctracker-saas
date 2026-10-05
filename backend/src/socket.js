const { Server } = require('socket.io');
let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    }
  });

  io.on('connection', (socket) => {
    // Chaque organisation a sa propre room
    socket.on('join_org', (orgId) => {
      socket.join(orgId);
      console.log(`🔌 Socket joined org room: ${orgId}`);
    });

    socket.on('disconnect', () => {});
  });

  console.log('🔌 Socket.io initialisé');
  return io;
}

function getIO() { return io; }

module.exports = { initSocket, getIO };

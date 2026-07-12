const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const roomManager = require('./RoomManager');
const { SOCKET_EVENTS } = require('./constants/events');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Map socket id to session id for easy lookup on disconnect
const socketSessionMap = new Map();

io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Attempt to reconnect using a previous session ID
    socket.on(SOCKET_EVENTS.RECONNECT_SESSION, ({ sessionId }, callback) => {
        const room = roomManager.reconnectPlayer(sessionId);
        if (room) {
            socketSessionMap.set(socket.id, sessionId);
            socket.join(room.id);
            if (typeof callback === 'function') callback({ success: true, room: roomManager.cleanRoomForClient(room) });
            io.to(room.id).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } else {
            if (typeof callback === 'function') callback({ success: false });
        }
    });

    socket.on(SOCKET_EVENTS.CREATE_ROOM, ({ username }, callback) => {
        try {
            const { room, sessionId } = roomManager.createRoom(username);
            socketSessionMap.set(socket.id, sessionId);
            socket.join(room.id);
            
            if (typeof callback === 'function') {
                callback({ success: true, room: roomManager.cleanRoomForClient(room), sessionId });
            }
            io.to(room.id).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ roomId, username }, callback) => {
        try {
            const upperRoomId = roomId.toUpperCase();
            const { room, sessionId } = roomManager.joinRoom(upperRoomId, username);
            socketSessionMap.set(socket.id, sessionId);
            socket.join(room.id);
            
            if (typeof callback === 'function') {
                callback({ success: true, room: roomManager.cleanRoomForClient(room), sessionId });
            }
            io.to(room.id).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });
    
    // --- Game Play Events ---
    
    socket.on(SOCKET_EVENTS.START_GAME, ({ roomId }, callback) => {
        try {
            const sessionId = socketSessionMap.get(socket.id);
            const room = roomManager.startGame(roomId, sessionId);
            if (typeof callback === 'function') callback({ success: true });
            
            // Broadcast full state (now includes gameState from LudoEngine)
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.ROLL_DICE, ({ roomId }, callback) => {
        try {
            const sessionId = socketSessionMap.get(socket.id);
            const { room, roll } = roomManager.rollDice(roomId, sessionId);
            if (typeof callback === 'function') callback({ success: true, roll });
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.MOVE_TOKEN, ({ roomId, tokenIndex }, callback) => {
        try {
            const sessionId = socketSessionMap.get(socket.id);
            const room = roomManager.moveToken(roomId, sessionId, tokenIndex);
            if (typeof callback === 'function') callback({ success: true });
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.REMATCH, ({ roomId }, callback) => {
        try {
            const sessionId = socketSessionMap.get(socket.id);
            const room = roomManager.rematch(roomId, sessionId);
            if (typeof callback === 'function') callback({ success: true });
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_UPDATE, roomManager.cleanRoomForClient(room));
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.SEND_REACTION, ({ roomId, emoji }, callback) => {
        try {
            const sessionId = socketSessionMap.get(socket.id);
            io.to(roomId).emit(SOCKET_EVENTS.REACTION, { emoji, playerId: sessionId });
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, message: error.message });
        }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        console.log(`Socket disconnected: ${socket.id}`);
        const sessionId = socketSessionMap.get(socket.id);
        if (sessionId) {
            roomManager.handleDisconnect(sessionId, io);
            socketSessionMap.delete(socket.id);
        }
    });
});
// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    // Catch-all route to serve index.html for client-side routing
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

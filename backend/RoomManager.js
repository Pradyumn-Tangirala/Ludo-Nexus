const crypto = require('crypto');
const LudoEngine = require('./GameEngine/LudoEngine').default;

class RoomManager {
    constructor() {
        this.rooms = new Map();
        // Maps sessionId to timeout ID
        this.disconnectTimeouts = new Map();
        // Maps roomId to timeout ID
        this.roomEmptyTimeouts = new Map();

        this.DISCONNECT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        this.EMPTY_ROOM_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    }

    generateId(length = 6) {
        return crypto.randomBytes(length).toString('hex').toUpperCase();
    }

    generateSessionId() {
        return crypto.randomUUID ? crypto.randomUUID() : this.generateId(16);
    }

    sanitizeUsername(name) {
        if (typeof name !== 'string') return 'Player';
        let sanitized = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
        if (sanitized.length > 15) {
            sanitized = sanitized.substring(0, 15);
        }
        return sanitized.length > 0 ? sanitized : 'Player';
    }

    createRoom(hostName) {
        let roomId;
        do {
            roomId = this.generateId(3); // 6 chars
        } while (this.rooms.has(roomId));

        const hostSessionId = this.generateSessionId();

        const room = {
            id: roomId,
            players: [
                {
                    sessionId: hostSessionId,
                    name: this.sanitizeUsername(hostName),
                    isHost: true,
                    status: 'online', // online, offline
                    color: null,
                },
            ],
            status: 'waiting', // waiting, playing
            maxPlayers: 4,
            engine: null,
        };
        this.rooms.set(roomId, room);

        this._clearRoomTimeout(roomId);

        return { room, sessionId: hostSessionId };
    }

    joinRoom(roomId, playerName) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'waiting') throw new Error('Game already started');
        if (room.players.length >= room.maxPlayers || room.players.length >= 4) throw new Error('Room is full');

        const sessionId = this.generateSessionId();
        room.players.push({
            sessionId,
            name: this.sanitizeUsername(playerName),
            isHost: false,
            status: 'online',
            color: null,
        });

        this._clearRoomTimeout(roomId);
        return { room, sessionId };
    }

    reconnectPlayer(sessionId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find((p) => p.sessionId === sessionId);
            if (player) {
                player.status = 'online';
                // Clear disconnect timeout if it exists
                if (this.disconnectTimeouts.has(sessionId)) {
                    clearTimeout(this.disconnectTimeouts.get(sessionId));
                    this.disconnectTimeouts.delete(sessionId);
                }
                this._clearRoomTimeout(roomId);

                return room;
            }
        }
        return null;
    }

    handleDisconnect(sessionId, io) {
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find((p) => p.sessionId === sessionId);
            if (player && player.status === 'online') {
                player.status = 'offline';

                // Broadcast updated status
                if (io) io.to(roomId).emit('room_update', this.cleanRoomForClient(room));

                // Start 5 min timer
                const timeoutId = setTimeout(() => {
                    this._removePlayer(roomId, sessionId, io);
                }, this.DISCONNECT_TIMEOUT);

                this.disconnectTimeouts.set(sessionId, timeoutId);
                return roomId;
            }
        }
        return null;
    }

    _removePlayer(roomId, sessionId, io) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        this.disconnectTimeouts.delete(sessionId);
        room.players = room.players.filter((p) => p.sessionId !== sessionId);

        if (room.players.length === 0) {
            // Start 10 min auto-delete timer
            const timeoutId = setTimeout(() => {
                this.rooms.delete(roomId);
                this.roomEmptyTimeouts.delete(roomId);
                console.log(`Room ${roomId} auto-deleted due to inactivity.`);
            }, this.EMPTY_ROOM_TIMEOUT);
            this.roomEmptyTimeouts.set(roomId, timeoutId);
        } else {
            // Reassign host if needed
            if (!room.players.find((p) => p.isHost)) {
                room.players[0].isHost = true;
            }
            if (io) io.to(roomId).emit('room_update', this.cleanRoomForClient(room));
        }
    }

    _clearRoomTimeout(roomId) {
        if (this.roomEmptyTimeouts.has(roomId)) {
            clearTimeout(this.roomEmptyTimeouts.get(roomId));
            this.roomEmptyTimeouts.delete(roomId);
        }
    }

    startGame(roomId, sessionId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        if (room.players.length < 2) throw new Error('Need at least 2 players');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || !player.isHost) throw new Error('Only the host can start the game');

        room.status = 'playing';

        // Assign colors based on player count
        const colors = ['red', 'green', 'yellow', 'blue'].slice(0, room.players.length);
        room.engine = new LudoEngine(colors);
        for (let i = 0; i < room.players.length; i++) {
            room.players[i].color = colors[i];
        }

        return room;
    }

    rollDice(roomId, sessionId) {
        const room = this.rooms.get(roomId);
        if (!room || !room.engine) throw new Error('Game not running');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || player.color !== room.engine.state.turn) throw new Error('Not your turn');

        const roll = room.engine.rollDice();
        return { roll, room };
    }

    moveToken(roomId, sessionId, tokenIndex) {
        const room = this.rooms.get(roomId);
        if (!room || !room.engine) throw new Error('Game not running');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || player.color !== room.engine.state.turn) throw new Error('Not your turn');

        const roll = room.engine.state.lastRoll;
        room.engine.moveToken(player.color, tokenIndex, roll);
        return room;
    }

    /**
     * Rematch resets the engine and keeps players in the room.
     */
    rematch(roomId, sessionId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const host = room.players.find((p) => p.isHost);
        if (!host || host.sessionId !== sessionId) {
            throw new Error('Only the host can trigger a rematch');
        }

        const colors = ['red', 'green', 'yellow', 'blue'].slice(0, room.players.length);
        room.engine = new LudoEngine(colors);
        room.players.forEach((p, idx) => {
            p.color = colors[idx];
        });

        room.status = 'playing';
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    cleanRoomForClient(room) {
        if (!room) return null;
        return {
            id: room.id,
            status: room.status,
            maxPlayers: room.maxPlayers,
            players: room.players.map((p) => ({
                id: p.sessionId,
                name: p.name,
                isHost: p.isHost,
                status: p.status,
                color: p.color,
            })),
            gameState: room.engine ? room.engine.getState() : null,
        };
    }
}

module.exports = new RoomManager();

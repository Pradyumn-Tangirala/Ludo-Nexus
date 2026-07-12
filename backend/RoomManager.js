const crypto = require('crypto');
const LudoEngine = require('./GameEngine/LudoEngine').default;

class RoomManager {
    constructor() {
        this.rooms = new Map();
        // Maps sessionId to timeout ID
        this.disconnectTimeouts = new Map();
        // Maps roomId to timeout ID
        this.roomEmptyTimeouts = new Map();
        // Maps roomId to AFK timeout ID
        this.turnTimeouts = new Map();

        this.DISCONNECT_TIMEOUT = 60 * 1000; // 60 seconds
        this.EMPTY_ROOM_TIMEOUT = 10 * 60 * 1000; // 10 minutes
        this.TURN_TIMEOUT = 30 * 1000; // 30 seconds
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
                    status: 'online', // online, offline, away
                    color: null,
                    isReady: false,
                    avatar: 'bottts:1',
                    role: 'player',
                    disconnectDeadline: null,
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

        let role = 'player';
        if (
            room.status === 'playing' ||
            room.players.filter((p) => p.role === 'player').length >= room.maxPlayers
        ) {
            role = 'spectator';
        }

        const sessionId = this.generateSessionId();
        room.players.push({
            sessionId,
            name: this.sanitizeUsername(playerName),
            isHost: false,
            status: 'online', // online, offline, away
            color: null,
            isReady: false,
            avatar: `bottts:${Math.floor(Math.random() * 100)}`,
            role: role,
            disconnectDeadline: null,
        });

        this._clearRoomTimeout(roomId);
        return { room, sessionId };
    }

    reconnectPlayer(sessionId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find((p) => p.sessionId === sessionId);
            if (player) {
                player.status = 'online';
                player.disconnectDeadline = null;
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
                player.disconnectDeadline = Date.now() + this.DISCONNECT_TIMEOUT;

                // Broadcast updated status
                if (io) io.to(roomId).emit('room_update', this.cleanRoomForClient(room));

                // Start 60s timer
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
                this._clearTurnTimeout(roomId);
                console.log(`Room ${roomId} auto-deleted due to inactivity.`);
            }, this.EMPTY_ROOM_TIMEOUT);
            this.roomEmptyTimeouts.set(roomId, timeoutId);
        } else {
            // Reassign host if needed
            const playersOnly = room.players.filter((p) => p.role === 'player');
            if (playersOnly.length > 0 && !playersOnly.find((p) => p.isHost)) {
                playersOnly[0].isHost = true;
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

    startGame(roomId, sessionId, io) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        const playersOnly = room.players.filter((p) => p.role === 'player');
        if (playersOnly.length < 2) throw new Error('Need at least 2 players');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || !player.isHost) throw new Error('Only the host can start the game');

        // Check global readiness
        const allReady = playersOnly.every((p) => p.isReady);
        if (!allReady) throw new Error('All players must be ready to start the game');

        room.status = 'playing';

        // Assign colors based on player count
        const colors = ['red', 'green', 'yellow', 'blue'].slice(0, playersOnly.length);
        room.engine = new LudoEngine(colors);
        for (let i = 0; i < playersOnly.length; i++) {
            playersOnly[i].color = colors[i];
        }

        this.resetTurnTimer(roomId, io);

        return room;
    }

    _clearTurnTimeout(roomId) {
        if (this.turnTimeouts.has(roomId)) {
            clearTimeout(this.turnTimeouts.get(roomId));
            this.turnTimeouts.delete(roomId);
        }
    }

    resetTurnTimer(roomId, io) {
        const room = this.rooms.get(roomId);
        if (!room || !room.engine) return;

        this._clearTurnTimeout(roomId);
        room.engine.state.turnDeadline = Date.now() + this.TURN_TIMEOUT;

        const timeoutId = setTimeout(() => {
            if (room && room.engine && room.status === 'playing') {
                room.engine.skipTurn(room.engine.state.turn);
                this.resetTurnTimer(roomId, io); // start timer for next player
                if (io) io.to(roomId).emit('room_update', this.cleanRoomForClient(room));
            }
        }, this.TURN_TIMEOUT);
        this.turnTimeouts.set(roomId, timeoutId);
    }

    rollDice(roomId, sessionId, io) {
        const room = this.rooms.get(roomId);
        if (!room || !room.engine) throw new Error('Game not running');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || player.color !== room.engine.state.turn) throw new Error('Not your turn');

        const roll = room.engine.rollDice();
        this.resetTurnTimer(roomId, io); // give another 30s to make the move
        return { roll, room };
    }

    toggleReady(roomId, sessionId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player) throw new Error('Player not found');

        player.isReady = !player.isReady;
        return room;
    }

    setAvatar(roomId, sessionId, avatarId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player) throw new Error('Player not found');

        player.avatar = avatarId;
        return room;
    }

    setStatus(roomId, sessionId, status) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player) return null;

        // Don't override 'offline' with 'away'
        if (player.status !== 'offline') {
            player.status = status;
        }
        return room;
    }

    moveToken(roomId, sessionId, tokenIndex, io) {
        const room = this.rooms.get(roomId);
        if (!room || !room.engine) throw new Error('Game not running');

        const player = room.players.find((p) => p.sessionId === sessionId);
        if (!player || player.color !== room.engine.state.turn) throw new Error('Not your turn');

        const roll = room.engine.state.lastRoll;
        room.engine.moveToken(player.color, tokenIndex, roll);

        // Timer for the next turn
        this.resetTurnTimer(roomId, io);
        return room;
    }

    /**
     * Rematch resets the engine and keeps players in the room.
     */
    rematch(roomId, sessionId, io) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');

        const host = room.players.find((p) => p.isHost);
        if (!host || host.sessionId !== sessionId) {
            throw new Error('Only the host can trigger a rematch');
        }

        const playersOnly = room.players.filter((p) => p.role === 'player');
        const colors = ['red', 'green', 'yellow', 'blue'].slice(0, playersOnly.length);
        room.engine = new LudoEngine(colors);
        playersOnly.forEach((p, idx) => {
            p.color = colors[idx];
        });

        room.status = 'playing';
        this.resetTurnTimer(roomId, io);
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
                isReady: p.isReady,
                avatar: p.avatar,
                role: p.role,
                disconnectDeadline: p.disconnectDeadline,
            })),
            gameState: room.engine ? room.engine.getState() : null,
        };
    }
}

module.exports = new RoomManager();

const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    RECONNECT_SESSION: 'reconnect_session',
    ROOM_UPDATE: 'room_update',
    START_GAME: 'start_game',
    ROLL_DICE: 'roll_dice',
    MOVE_TOKEN: 'move_token',
    REMATCH: 'rematch',
    SEND_REACTION: 'send_reaction',
    REACTION: 'reaction',
};

module.exports = { SOCKET_EVENTS };

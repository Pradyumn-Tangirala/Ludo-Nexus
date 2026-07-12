import { Room } from './game';

export interface SocketResponse<T = any> {
    success: boolean;
    message?: string;
    room?: Room;
    sessionId?: string;
    roll?: number;
    data?: T;
}

export interface ReactionPayload {
    emoji: string;
    playerId: string;
}

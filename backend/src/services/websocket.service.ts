import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config';
import { WebSocketMessage, WebSocketMessageType } from '../types';

class WebSocketService {
    private wss: WebSocketServer | null = null;
    private clients = new Set<WebSocket>();

    initialize(server: Server): void {
        this.wss = new WebSocketServer({
            server,
            path: config.ws.path,
        });

        this.wss.on('connection', (ws) => {
            this.clients.add(ws);

            this.sendToClient(ws, {
                type: 'connection_status',
                payload: { connected: true, app: config.app.name },
                timestamp: new Date().toISOString(),
            });

            ws.on('close', () => {
                this.clients.delete(ws);
            });

            ws.on('error', () => {
                this.clients.delete(ws);
            });
        });

        console.log(`[WS] Listening on ${config.ws.path}`);
    }

    broadcast<T>(type: WebSocketMessageType, payload: T): void {
        const message: WebSocketMessage<T> = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };

        const serialized = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(serialized);
            }
        }
    }

    getClientCount(): number {
        return this.clients.size;
    }

    private sendToClient<T>(ws: WebSocket, message: WebSocketMessage<T>): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}

export const wsService = new WebSocketService();

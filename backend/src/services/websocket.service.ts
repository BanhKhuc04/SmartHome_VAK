import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { config } from '../config';
import { WebSocketMessage, WebSocketMessageType } from '../types';

class WebSocketService {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();

    initialize(server: Server): void {
        this.wss = new WebSocketServer({
            server,
            path: config.ws.path,
        });

        this.wss.on('connection', (ws: WebSocket) => {
            this.clients.add(ws);
            console.log(`[WS] Client connected (total: ${this.clients.size})`);

            // Send connection confirmation
            this.sendToClient(ws, {
                type: 'connection_status',
                payload: { connected: true },
                timestamp: new Date().toISOString(),
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`[WS] Client disconnected (total: ${this.clients.size})`);
            });

            ws.on('error', (error) => {
                console.error('[WS] Client error:', error.message);
                this.clients.delete(ws);
            });
        });

        console.log(`[WS] WebSocket server initialized on path ${config.ws.path}`);
    }

    broadcast(type: WebSocketMessageType, payload: unknown): void {
        const message: WebSocketMessage = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };

        const data = JSON.stringify(message);

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    getClientCount(): number {
        return this.clients.size;
    }
}

export const wsService = new WebSocketService();

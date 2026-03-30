import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    sendMessage: (msg: unknown) => void;
}

export function useWebSocket(
    onMessage?: (message: WebSocketMessage) => void
): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);
                    onMessageRef.current?.(message);
                } catch (err) {
                    console.warn('[WS] Invalid message:', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected, reconnecting in 3s...');
                setIsConnected(false);
                wsRef.current = null;

                // Auto-reconnect
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                ws.close();
            };
        } catch (err) {
            console.error('[WS] Connection failed:', err);
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 3000);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((msg: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    return { isConnected, lastMessage, sendMessage };
}

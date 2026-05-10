import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../types';

const getWsUrl = () => {
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl && envUrl !== 'auto') {
        return envUrl;
    }

    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}:5000/ws`;
};

const WS_URL = getWsUrl();

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const onMessageRef = useRef(onMessage);

    onMessageRef.current = onMessage;

    const connect = useCallback(() => {
        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WebSocketMessage;
                setLastMessage(message);
                onMessageRef.current?.(message);
            } catch (error) {
                console.warn('[WS] Failed to parse message', error);
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            socketRef.current = null;
            reconnectTimerRef.current = window.setTimeout(connect, 3000);
        };

        socket.onerror = () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }
            socketRef.current?.close();
        };
    }, [connect]);

    return { isConnected, lastMessage };
}

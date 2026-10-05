import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
const WS_URL = process.env.REACT_APP_WS_URL || window.location.origin;
const SOCKET_URL = 'https://doctracker.monairbyte.eu:4001';

export function SocketProvider({ token, children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef({});

  useEffect(() => {
    if (!token) return;
    if (socketRef.current) return;

    console.log('🔌 Création socket unique');
    const socket = io(SOCKET_URL + '/admin', {
      auth: { token },
      transports: ['polling'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => { console.log('🔌 Connecté:', socket.id); setConnected(true); });
    socket.on('disconnect', (r) => { console.log('🔌 Déconnecté:', r); setConnected(false); });

    const events = [
      'document_opened','download_detected','unauthorized_access',
      'new_alert','view_progress','link_shared','suspicious_behavior'
    ];

    events.forEach(evt => {
      socket.on(evt, (data) => {
        Object.values(handlersRef.current).forEach(handler => handler(evt, data));
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]); // eslint-disable-next-line

  const subscribe = (id, handler) => { handlersRef.current[id] = handler; };
  const unsubscribe = (id) => { delete handlersRef.current[id]; };

  return (
    <SocketContext.Provider value={{ connected, subscribe, unsubscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketEvent(id, handler) {
  const ctx = useContext(SocketContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx) return;
    ctx.subscribe(id, (evt, data) => handlerRef.current(evt, data));
    return () => ctx.unsubscribe(id);
  }, [id, ctx]);
}

export const useSocketContext = () => useContext(SocketContext);

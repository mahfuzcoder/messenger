import { io } from 'socket.io-client';
import { apiOrigin } from './api.js';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(apiOrigin() || window.location.origin, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer | null = null

export function setSocketIO(socketInstance: SocketIOServer): void {
  io = socketInstance
}

export function getSocketIO(): SocketIOServer | null {
  return io
}

export function emitEvent(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}

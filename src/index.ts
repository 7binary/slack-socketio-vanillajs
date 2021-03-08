import express from 'express';
import { createServer } from 'http';
import { Namespace, Server, Socket } from 'socket.io';
import { namespaces } from './data';

// Server app init
const app = express();
app.use(express.static(`${__dirname}/public`));
const server = createServer(app);

// Socket IO init
const io = new Server(server);

// namespace /, io.on === io.of('/').on === io.sockets.on
const nsIndex = io.of('/');
nsIndex.on('connect', (socket: Socket) => {
  socket.emit('nsList', namespaces.map(ns => ns.toArray()));
});

// namespaces from data file, listen connections
namespaces.forEach(namespace => {
  const nsServer = io.of(namespace.path);
  nsServer.on('connect', (nsSocket: Socket) => {
    console.log(`_ ${nsSocket.id} have joined ns "${namespace.path}" with title "${namespace.title}"`);
    // send namespaces to client on connection
    nsSocket.emit('nsRoomLoad', namespace.getRooms());

    // JOIN ROOM: client picked a room, join client's socket to that room
    nsSocket.on('joinRoomId', async (roomId: number, sendRoomInfo: Function) => {
      // leave prev room
      const roomToLeave = Array.from(nsSocket.rooms)[1];
      roomToLeave && nsSocket.leave(roomToLeave);
      await updateUsersInRoom(nsServer, roomToLeave);
      // join new room
      const roomToJoin = `${roomId}`;
      nsSocket.join(roomToJoin);
      // client wants to know about this room and how many users are connected
      const nsRoom = namespace.findRoomByName(roomToJoin);
      nsRoom && sendRoomInfo(nsRoom.toArray());
      await updateUsersInRoom(nsServer, roomToJoin);
      console.log(`_ ${nsSocket.id} have joined room "${roomToJoin}" with title "${nsRoom.title}"`);
    });

    // MSG FROM CLIENT: new message from Client
    nsSocket.on('newMessageToServer', msg => {
      console.log('_ newMessageToServer:', msg);
      const fullMessage = {
        text: msg,
        time: Date.now(),
        username: nsSocket.handshake.query.username as string,
        avatar: 'https://via.placeholder.com/30',
      };

      // FIND ROOM: [0]=sockets own room, created on connection, [1]=last joined room
      const roomName = Array.from(nsSocket.rooms)[1];
      const nsRoom = namespace.findRoomByName(roomName);

      // ADD MESSAGE
      nsRoom && nsRoom.addMessage(fullMessage);
      nsServer.to(roomName).emit('messageToClients', fullMessage);
    });
  });
});

async function updateUsersInRoom(nsServer: Namespace, roomName: string) {
  const socketIds = await nsServer.to(roomName).allSockets();
  nsServer.to(roomName).emit('updateChatMembers', socketIds.size);
}

server.listen(8000, () => console.log('_ Listen 8000'));

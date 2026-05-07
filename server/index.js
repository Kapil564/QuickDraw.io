import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "crypto";

const app = express();
const httpServer = createServer(app);

// Enable CORS so the client can connect
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : "*";
const io = new Server(httpServer, { 
  cors: {
    origin: allowedOrigins, // Adjust this to your client URL in production
    methods: ["GET", "POST"]
  }
});

// ─── Room & Player State ──────────────────────────────────────────────────────
// rooms Map: roomID -> { players: Map<socketId, { name, id, avatarColor }>, createdAt }
const rooms = new Map();

function generateRoomID() {
  // 6-char hex string
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function getRoomPlayers(roomID) {
  const room = rooms.get(roomID);
  if (!room) return [];
  return Array.from(room.players.values());
}

// Generate a consistent avatar color from the player name
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

// ─── Socket.IO Connection Handler ─────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  let currentRoom = null;

  // ── Create Room ──────────────────────────────────────────────────────────────
  socket.on("create-room", ({ playerName }, callback) => {
    const roomID = generateRoomID();
    const player = {
      id: socket.id,
      name: playerName,
      avatarColor: avatarColor(playerName)
    };

    rooms.set(roomID, {
      players: new Map([[socket.id, player]]),
      createdAt: Date.now()
    });

    socket.join(roomID);
    currentRoom = roomID;

    console.log(`Room ${roomID} created by ${playerName}`);

    if (typeof callback === "function") {
      callback({ success: true, roomID, player });
    }

    io.to(roomID).emit("player-list", getRoomPlayers(roomID));
  });

  // ── Join Room ────────────────────────────────────────────────────────────────
  socket.on("join-room", ({ roomID, playerName }, callback) => {
    const room = rooms.get(roomID);

    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Room not found. Check the Room ID and try again." });
      }
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      avatarColor: avatarColor(playerName)
    };

    room.players.set(socket.id, player);
    socket.join(roomID);
    currentRoom = roomID;

    console.log(`${playerName} joined room ${roomID}`);

    if (typeof callback === "function") {
      callback({ success: true, roomID, player });
    }

    socket.to(roomID).emit("message", { text: `${playerName} joined the room!`, type: "system" });
    io.to(roomID).emit("player-list", getRoomPlayers(roomID));
  });

  // ── Chat Messages (room-scoped) ─────────────────────────────────────────────
  socket.on("message", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("message", data);
  });

  // ── Drawing Events (room-scoped) ────────────────────────────────────────────
  socket.on("draw", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("draw", data);
  });

  socket.on("clear", () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("clear");
  });

  socket.on("undo", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("undo", data);
  });

  socket.on("fill", (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("fill", data);
  });

  // ── Disconnect & Cleanup ────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      const player = room.players.get(socket.id);
      const playerName = player ? player.name : "A player";

      room.players.delete(socket.id);

      io.to(currentRoom).emit("message", { text: `${playerName} left the room.`, type: "system" });
      io.to(currentRoom).emit("player-list", getRoomPlayers(currentRoom));

      // If room is empty, clean it up
      if (room.players.size === 0) {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} deleted (empty)`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
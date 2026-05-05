import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

// Enable CORS so the client can connect
const io = new Server(httpServer, { 
  cors: {
    origin: "*", // Adjust this to your client URL in production
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("A user connected with ID:", socket.id);

  // Send a welcome message to the newly connected client
  socket.emit("message", "Welcome to the drawing board!");

  // Listen for messages from the client
  socket.on("message", (data) => {
    console.log("Received message from client:", data);
    // Broadcast the message to all other clients
    socket.broadcast.emit("message", data);
  });

  // Listen for draw events
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  // Listen for clear events
  socket.on("clear", () => {
    socket.broadcast.emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
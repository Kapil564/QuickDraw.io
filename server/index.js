import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import { pickRandomWords } from "./words.js";

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : "*";
const io = new Server(httpServer, { 
  cors: {
    origin: allowedOrigins, 
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

/**
 * Levenshtein distance — counts minimum single-character edits
 * (insert, delete, substitute) to turn string `a` into string `b`.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const MAX_PLAYERS_PER_ROOM = 8;
const WORD_CHOOSE_TIMEOUT = 15000; 
const ROUND_DRAW_TIMEOUT = 60000; 

function createGameState() {
  return {
    state: "waiting",    
    currentDrawer: null, 
    currentWord: null,   
    wordChoices: [],     
    round: 0,
    usedWords: new Set(),
    chooseTimer: null,   
    roundTimer: null,
    timeLeft: 0,
  };
}

function generateRoomID() {
  
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function getRoomPlayers(roomID) {
  const room = rooms.get(roomID);
  if (!room) return [];
  return Array.from(room.players.values());
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function findAvailablePublicRoom() {
  for (const [roomID, room] of rooms) {
    if (room.visibility === "public" && room.players.size < room.maxPlayers) {
      return roomID;
    }
  }
  return null;
}

function startNextTurn(roomID) {
  const room = rooms.get(roomID);
  if (!room) return;
  const game = room.game;
  const players = Array.from(room.players.values());

  if (players.length < 2) {
    io.to(roomID).emit("message", { text: `Not enough players to continue. Waiting for more...`, type: "system" });
    game.state = "waiting";
    game.currentDrawer = null;
    io.to(roomID).emit("game-state", { state: "waiting" });
    return;
  }

  let nextIndex = 0;
  if (game.currentDrawer) {
    const currentIndex = players.findIndex(p => p.id === game.currentDrawer);
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % players.length;
      if (nextIndex === 0) game.round += 1;
    } else {
      game.round += 1;
    }
  } else {
    game.round = 1;
  }

  const nextDrawer = players[nextIndex];
  game.currentDrawer = nextDrawer.id;
  game.state = "choosing";
  game.currentWord = null;
  
  if (game.roundTimer) clearTimeout(game.roundTimer);
  if (game.chooseTimer) clearTimeout(game.chooseTimer);

  let choices = pickRandomWords(3);
  let attempts = 0;
  while (choices.some(c => game.usedWords.has(c.word)) && attempts < 10) {
    choices = pickRandomWords(3);
    attempts++;
  }
  game.wordChoices = choices;

  io.to(nextDrawer.id).emit("word-choices", { choices, timeLimit: WORD_CHOOSE_TIMEOUT });

  io.to(roomID).emit("game-state", {
    state: "choosing",
    drawerId: nextDrawer.id,
    drawerName: nextDrawer.name,
    round: game.round,
  });

  io.to(roomID).emit("message", {
    text: `🎮 Round ${game.round}! ${nextDrawer.name} is choosing a word...`,
    type: "system"
  });

  game.chooseTimer = setTimeout(() => {
    if (game.state === "choosing" && game.currentDrawer === nextDrawer.id) {
      const autoChoice = game.wordChoices[0];
      startDrawingPhase(roomID, autoChoice.word);
      io.to(roomID).emit("message", {
        text: `Time's up! A word was auto-selected. Start drawing!`,
        type: "system"
      });
    }
  }, WORD_CHOOSE_TIMEOUT);
}

function startDrawingPhase(roomID, word) {
  const room = rooms.get(roomID);
  if (!room) return;
  const game = room.game;
  const player = room.players.get(game.currentDrawer);

  if (game.chooseTimer) {
    clearTimeout(game.chooseTimer);
    game.chooseTimer = null;
  }

  game.currentWord = word;
  game.usedWords.add(word);
  game.state = "drawing";
  game.wordChoices = [];
  game.timeLeft = ROUND_DRAW_TIMEOUT / 1000;

  const hint = word.replace(/[a-zA-Z]/g, "_");

  io.to(game.currentDrawer).emit("word-assigned", { word });

  io.to(roomID).emit("game-state", {
    state: "drawing",
    drawerId: game.currentDrawer,
    drawerName: player?.name || "Unknown",
    round: game.round,
    hint,
    wordLength: word.length,
    timeLeft: game.timeLeft
  });

  io.to(roomID).emit("clear"); 

  game.roundTimer = setTimeout(() => {
    endTurn(roomID, "time-up");
  }, ROUND_DRAW_TIMEOUT);
}

function endTurn(roomID, reason) {
  const room = rooms.get(roomID);
  if (!room) return;
  const game = room.game;

  if (game.roundTimer) {
    clearTimeout(game.roundTimer);
    game.roundTimer = null;
  }
  if (game.chooseTimer) {
    clearTimeout(game.chooseTimer);
    game.chooseTimer = null;
  }

  game.state = "roundEnd";

  io.to(roomID).emit("game-state", {
    state: "roundEnd",
    currentWord: game.currentWord
  });

  io.to(roomID).emit("message", {
    text: `Time's up! The word was: ${game.currentWord}`,
    type: "system"
  });

  setTimeout(() => {
    if (rooms.has(roomID)) {
      startNextTurn(roomID);
    }
  }, 5000);
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  let currentRoom = null;

  function addPlayerToRoom(roomID, playerName) {
    const room = rooms.get(roomID);
    if (!room) return null;

    const role = room.players.size === 0 ? "admin" : "player";

    const player = {
      id: socket.id,
      name: playerName,
      avatarColor: avatarColor(playerName),
      role
    };

    room.players.set(socket.id, player);
    socket.join(roomID);
    currentRoom = roomID;

    return player;
  }

  socket.on("quick-match", ({ playerName }, callback) => {
    if (!playerName || !playerName.trim()) {
      return typeof callback === "function" && callback({ success: false, error: "Name is required." });
    }

    let roomID = findAvailablePublicRoom();
    let isNewRoom = false;

    if (!roomID) {
      roomID = generateRoomID();
      rooms.set(roomID, {
        players: new Map(),
        visibility: "public",
        maxPlayers: MAX_PLAYERS_PER_ROOM,
        createdAt: Date.now(),
        game: createGameState()
      });
      isNewRoom = true;
      console.log(`Public room ${roomID} created for quick-match`);
    }

    const room = rooms.get(roomID);

    if (room.players.size >= room.maxPlayers) {
      
      const retryID = findAvailablePublicRoom();
      if (retryID) {
        roomID = retryID;
      } else {
        roomID = generateRoomID();
        rooms.set(roomID, {
          players: new Map(),
          visibility: "public",
          maxPlayers: MAX_PLAYERS_PER_ROOM,
          createdAt: Date.now(),
          game: createGameState()
        });
        console.log(`Public room ${roomID} created (retry) for quick-match`);
      }
    }

    const player = addPlayerToRoom(roomID, playerName);

    console.log(`${playerName} quick-matched into room ${roomID}${isNewRoom ? ' (new)' : ''}`);

    if (typeof callback === "function") {
      callback({ success: true, roomID, player });
    }

    if (!isNewRoom) {
      socket.to(roomID).emit("message", { text: `${playerName} joined the room!`, type: "system" });
    }
    io.to(roomID).emit("player-list", getRoomPlayers(roomID));
  });

  socket.on("create-room", ({ playerName }, callback) => {
    if (!playerName || !playerName.trim()) {
      return typeof callback === "function" && callback({ success: false, error: "Name is required." });
    }

    const roomID = generateRoomID();
    const player = {
      id: socket.id,
      name: playerName,
      avatarColor: avatarColor(playerName),
      role: "admin"
    };

    rooms.set(roomID, {
      players: new Map([[socket.id, player]]),
      visibility: "private",
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      createdAt: Date.now(),
      game: createGameState()
    });

    socket.join(roomID);
    currentRoom = roomID;

    console.log(`Private room ${roomID} created by ${playerName}`);

    if (typeof callback === "function") {
      callback({ success: true, roomID, player });
    }

    io.to(roomID).emit("player-list", getRoomPlayers(roomID));
  });

  socket.on("join-room", ({ roomID, playerName }, callback) => {
    const room = rooms.get(roomID);

    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Room not found. Check the Room ID and try again." });
      }
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      if (typeof callback === "function") {
        callback({ success: false, error: `Room is full (${room.maxPlayers}/${room.maxPlayers} players).` });
      }
      return;
    }

    const player = addPlayerToRoom(roomID, playerName);

    console.log(`${playerName} joined room ${roomID}`);

    if (typeof callback === "function") {
      callback({ success: true, roomID, player });
    }

    socket.to(roomID).emit("message", { text: `${playerName} joined the room!`, type: "system" });
    io.to(roomID).emit("player-list", getRoomPlayers(roomID));
  });

  socket.on("start-game", (callback) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== "admin") {
      return typeof callback === "function" && callback({ success: false, error: "Only the admin can start the game." });
    }

    if (room.players.size < 2) {
      return typeof callback === "function" && callback({ success: false, error: "Need at least 2 players to start." });
    }

    startNextTurn(currentRoom);

    if (typeof callback === "function") {
      callback({ success: true });
    }
  });

  socket.on("choose-word", ({ word }, callback) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const game = room.game;
    if (game.state !== "choosing" || game.currentDrawer !== socket.id) {
      return typeof callback === "function" && callback({ success: false, error: "Not your turn to choose." });
    }

    const validChoice = game.wordChoices.find(c => c.word === word);
    if (!validChoice) {
      return typeof callback === "function" && callback({ success: false, error: "Invalid word choice." });
    }

    startDrawingPhase(currentRoom, word);

    const player = room.players.get(socket.id);
    const hint = word.replace(/[a-zA-Z]/g, "_");
    console.log(`Word chosen in room ${currentRoom}: "${word}" by ${player?.name}`);

    if (typeof callback === "function") {
      callback({ success: true });
    }

    io.to(currentRoom).emit("message", {
      text: `${player?.name} has chosen a word! Start guessing! (${hint})`,
      type: "system"
    });
  });

  socket.on("leave-room", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomToLeave = currentRoom;
      handlePlayerLeave(roomToLeave);
      socket.leave(roomToLeave);
      currentRoom = null;
    }
  });

  socket.on("message", (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    const game = room.game;

    // During drawing phase, check guesses from non-drawers
    if (
      game.state === "drawing" &&
      game.currentWord &&
      game.currentDrawer !== socket.id
    ) {
      const guess = data.text.trim().toLowerCase();
      const answer = game.currentWord.toLowerCase();

      // --- Exact match → correct guess ---
      if (guess === answer) {
        io.to(currentRoom).emit("message", {
          text: `🎉 ${player?.name || "Someone"} guessed the word!`,
          type: "correct-guess",
          guesserName: player?.name,
          guesserId: socket.id,
        });
        return;
      }

      // --- Close guess → private hint to the guesser ---
      const dist = levenshtein(guess, answer);
      const threshold = answer.length <= 4 ? 1 : 2;
      if (dist > 0 && dist <= threshold) {
        // Relay the message normally to others first
        socket.to(currentRoom).emit("message", {
          ...data,
          senderName: player?.name,
          senderId: socket.id,
        });
        // Then send a private close-guess hint only to the guesser
        socket.emit("message", {
          text: `🔥 You're so close!`,
          type: "close-guess",
        });
        return;
      }
    }

    // Normal message relay
    socket.to(currentRoom).emit("message", {
      ...data,
      senderName: player?.name,
      senderId: socket.id,
    });
  });

  socket.on("draw", (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    // Only the current drawer may broadcast drawing events
    if (room.game.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit("draw", data);
  });

  socket.on("clear", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (room.game.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit("clear");
  });

  socket.on("undo", (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (room.game.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit("undo", data);
  });

  socket.on("fill", (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (room.game.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit("fill", data);
  });

  function handlePlayerLeave(roomID) {
    const room = rooms.get(roomID);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player ? player.name : "A player";
    const wasAdmin = player?.role === "admin";

    room.players.delete(socket.id);

    if (wasAdmin && room.players.size > 0) {
      const nextAdmin = room.players.values().next().value;
      nextAdmin.role = "admin";
      io.to(roomID).emit("message", {
        text: `${nextAdmin.name} is now the Room Admin.`,
        type: "system"
      });
    }

    if (room.game.currentDrawer === socket.id && (room.game.state === "drawing" || room.game.state === "choosing")) {
      io.to(roomID).emit("message", { text: `The artist left! Ending turn.`, type: "system" });
      endTurn(roomID, "drawer-left");
    }

    io.to(roomID).emit("message", { text: `${playerName} left the room.`, type: "system" });
    io.to(roomID).emit("player-list", getRoomPlayers(roomID));

    if (room.players.size === 0) {
      rooms.delete(roomID);
      console.log(`Room ${roomID} deleted (empty)`);
    }
  }

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (currentRoom && rooms.has(currentRoom)) {
      handlePlayerLeave(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
import { io } from "socket.io-client";

document.addEventListener("DOMContentLoaded", () => {
  // --- Socket.io Setup ---
  // Connect to the server. Adjust the URL if the server is hosted elsewhere.
  const socket = io("http://localhost:3000");

  const statusIndicator = document.querySelector(".status-indicator");
  const statusText = document.querySelector(".status-text");

  socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);
    statusIndicator.className = "status-indicator connected";
    statusText.textContent = "Connected";
    addSystemMessage("Connected to the server!");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
    statusIndicator.className = "status-indicator disconnected";
    statusText.textContent = "Disconnected";
    addSystemMessage("Disconnected from the server.");
  });

  socket.on("connect_error", (err) => {
    statusIndicator.className = "status-indicator disconnected";
    statusText.textContent = "Connection Error";
  });

  // Listen for messages
  socket.on("message", (data) => {
    console.log("Received message:", data);
    if (typeof data === "string") {
      addSystemMessage(data);
    } else {
      addMessage(data.text, data.senderId === socket.id);
    }
  });

  // --- Chat Setup ---
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const messagesContainer = document.getElementById("messages-container");

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
      const messageData = { text, senderId: socket.id };
      // Display locally
      addMessage(text, true);
      // Send to server
      socket.emit("message", messageData);
      chatInput.value = "";
    }
  });

  function addMessage(text, isSelf = false) {
    const div = document.createElement("div");
    div.className = `message ${isSelf ? "self" : ""}`;
    div.textContent = text;
    messagesContainer.appendChild(div);
    scrollToBottom();
  }

  function addSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "message system";
    div.textContent = text;
    messagesContainer.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // --- Canvas Setup ---
  const canvas = document.getElementById("drawing-board");
  const ctx = canvas.getContext("2d");
  const container = document.querySelector(".canvas-container");

  // State
  let isDrawing = false;
  let currentColor = "#ffffff";
  let currentBrushSize = 5;

  // Resize canvas to match its container exactly
  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Set default drawing styles
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas(); // Initial resize

  socket.on("clear", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // Drawing logic
  let currentX = 0;
  let currentY = 0;

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    // For mouse events
    if (e.clientX !== undefined) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    // For touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  }

  function onMouseDown(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    currentX = pos.x;
    currentY = pos.y;
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    const pos = getMousePos(e);
    drawLine(currentX, currentY, pos.x, pos.y, currentColor, currentBrushSize, true);
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    drawLine(currentX, currentY, pos.x, pos.y, currentColor, currentBrushSize, true);
    currentX = pos.x;
    currentY = pos.y;
  }

  function drawLine(x0, y0, x1, y1, color, size, emit) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    // Relative coordinates to support different screen sizes (as discussed in details.md)
    const w = canvas.width;
    const h = canvas.height;

    socket.emit("draw", {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
      size
    });
  }

  // Handle normalized relative coordinates from server
  socket.on("draw", (data) => {
    const w = canvas.width;
    const h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false);
  });

  // Event listeners for drawing
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mouseout", onMouseUp);
  canvas.addEventListener("mousemove", onMouseMove);

  // Touch support
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); onMouseDown(e); }, { passive: false });
  canvas.addEventListener("touchend", (e) => { e.preventDefault(); onMouseUp(e); }, { passive: false });
  canvas.addEventListener("touchcancel", (e) => { e.preventDefault(); onMouseUp(e); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); onMouseMove(e); }, { passive: false });

  // --- UI Tools ---
  const colorBtns = document.querySelectorAll(".color-btn");
  const colorPicker = document.getElementById("color-picker");
  const brushSizeInput = document.getElementById("brush-size");
  const brushSizeVal = document.getElementById("brush-size-val");
  const clearBtn = document.getElementById("clear-btn");

  function setColor(color) {
    currentColor = color;
    colorBtns.forEach(btn => btn.classList.remove("active"));
  }

  colorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      setColor(btn.dataset.color);
      btn.classList.add("active");
    });
  });

  colorPicker.addEventListener("input", (e) => {
    setColor(e.target.value);
  });

  brushSizeInput.addEventListener("input", (e) => {
    currentBrushSize = parseInt(e.target.value);
    brushSizeVal.textContent = currentBrushSize;
  });

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear");
  });
});

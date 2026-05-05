import { socket } from "./socket.js";

export function initDrawing() {
  const canvas = document.getElementById("drawing-board");
  const ctx = canvas.getContext("2d");
  const container = document.querySelector(".canvas-container");

  // State
  let isDrawing = false;
  let currentColor = "primary";
  let currentBrushSize = 5;
  let currentMode = "brush";
  let history = [];

  function saveHistory() {
    history.push(canvas.toDataURL());
    if (history.length > 20) history.shift();
  }

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
    saveHistory();
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
    saveHistory();
    if (currentMode === "fill") {
      fillCanvas(currentColor, true);
      return;
    }
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
    let actualColor = color;
    if (color === "primary") {
      actualColor = document.body.classList.contains("light-mode") ? "#1c1c1e" : "#ffffff";
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = actualColor;
    ctx.lineWidth = size;
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    // Relative coordinates to support different screen sizes
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

  function fillCanvas(color, emit) {
    let actualColor = color;
    if (color === "primary") {
      actualColor = document.body.classList.contains("light-mode") ? "#1c1c1e" : "#ffffff";
    }
    ctx.fillStyle = actualColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (emit) {
      socket.emit("fill", { color });
    }
  }

  socket.on("fill", (data) => {
    saveHistory();
    fillCanvas(data.color, false);
  });

  function restoreCanvas(dataUrl) {
    if (!dataUrl) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }

  socket.on("undo", (data) => {
    restoreCanvas(data?.imgData);
  });

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
  const undoBtn = document.getElementById("undo-btn");
  const modeBrush = document.getElementById("mode-brush");
  const modeFill = document.getElementById("mode-fill");

  modeBrush.addEventListener("click", () => {
    currentMode = "brush";
    modeBrush.classList.add("active");
    modeFill.classList.remove("active");
    canvas.style.cursor = "url(/pencil.png) 0 32, auto";
  });
  
  modeFill.addEventListener("click", () => {
    currentMode = "fill";
    modeFill.classList.add("active");
    modeBrush.classList.remove("active");
    canvas.style.cursor = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z\"/><path d=\"m5 2 5 5\"/><path d=\"M2 13h15\"/><path d=\"M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z\"/></svg>') 0 24, pointer";
  });

  undoBtn.addEventListener("click", () => {
    if (history.length > 0) {
      const prevData = history.pop();
      restoreCanvas(prevData);
      socket.emit("undo", { imgData: prevData });
    }
  });

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
    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear");
  });
}

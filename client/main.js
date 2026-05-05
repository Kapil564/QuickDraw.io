import { initSocket } from "./socket.js";
import { initChat } from "./chat.js";
import { initDrawing } from "./drawing.js";
import { initTheme } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize modular features
  initSocket();
  initTheme();
  initChat();
  initDrawing();
});

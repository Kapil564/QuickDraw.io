import { io } from "socket.io-client";

// Connect to the server. Adjust the URL if the server is hosted elsewhere.
export const socket = io("http://localhost:3000");

export function initSocket() {
  const statusIndicator = document.querySelector(".status-indicator");
  const statusText = document.querySelector(".status-text");

  socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);
    statusIndicator.className = "status-indicator connected";
    statusText.textContent = "Connected";
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
    statusIndicator.className = "status-indicator disconnected";
    statusText.textContent = "Disconnected";
  });

  socket.on("connect_error", (err) => {
    statusIndicator.className = "status-indicator disconnected";
    statusText.textContent = "Connection Error";
  });
}

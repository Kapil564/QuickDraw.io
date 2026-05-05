import { socket } from "./socket.js";

export function initChat() {
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const messagesContainer = document.getElementById("messages-container");

  // Listen for messages from server
  socket.on("message", (data) => {
    console.log("Received message:", data);
    if (typeof data === "string") {
      addSystemMessage(data);
    } else {
      addMessage(data.text, data.senderId === socket.id);
    }
  });

  // Also listen for connect/disconnect to show system messages
  socket.on("connect", () => {
    addSystemMessage("Connected to the server!");
  });

  socket.on("disconnect", () => {
    addSystemMessage("Disconnected from the server.");
  });

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
}

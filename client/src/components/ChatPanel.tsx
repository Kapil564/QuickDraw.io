import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useSocketContext } from '../context/SocketContext';
import type { DisplayMessage, ChatMessageData } from '../types';

let msgIdCounter = 0;

export default function ChatPanel() {
  const { socket } = useSocketContext();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming messages
  useEffect(() => {
    const onMessage = (data: any) => {
      if (typeof data === 'string') {
        setMessages(prev => [...prev, { id: String(++msgIdCounter), text: data, type: 'system' }]);
      } else if (data.type === 'system') {
        setMessages(prev => [...prev, { id: String(++msgIdCounter), text: data.text, type: 'system' }]);
      } else {
        const type = data.senderId === socket.id ? 'self' : 'other';
        setMessages(prev => [...prev, { id: String(++msgIdCounter), text: data.text, type }]);
      }
    };

    socket.on('message', onMessage);
    return () => { socket.off('message', onMessage); };
  }, [socket]);

  // System messages for connect/disconnect
  useEffect(() => {
    const onConnect = () => {
      setMessages(prev => [...prev, { id: String(++msgIdCounter), text: 'Connected to the server!', type: 'system' }]);
    };
    const onDisconnect = () => {
      setMessages(prev => [...prev, { id: String(++msgIdCounter), text: 'Disconnected from the server.', type: 'system' }]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [socket]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const messageData: ChatMessageData = { text, senderId: socket.id! };
    setMessages(prev => [...prev, { id: String(++msgIdCounter), text, type: 'self' }]);
    socket.emit('message', messageData);
    setInput('');
  };

  return (
    <div className="chat-panel">
      <h3>Messages</h3>
      <div className="messages" id="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.type === 'self' ? 'self' : ''} ${msg.type === 'system' ? 'system' : ''}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" id="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          id="chat-input"
          placeholder="Type a message..."
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

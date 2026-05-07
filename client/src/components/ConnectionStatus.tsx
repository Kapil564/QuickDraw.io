import { useSocketContext } from '../context/SocketContext';

export default function ConnectionStatus() {
  const { isConnected, connectionError } = useSocketContext();

  const statusClass = isConnected ? 'connected' : 'disconnected';
  const statusText = connectionError
    ? 'Connection Error'
    : isConnected
      ? 'Connected!'
      : 'Connecting...';

  return (
    <div className="connection-status">
      <span className={`status-indicator ${statusClass}`} />
      <span>{statusText}</span>
    </div>
  );
}

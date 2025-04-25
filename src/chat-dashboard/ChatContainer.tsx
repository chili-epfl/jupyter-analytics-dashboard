import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { runIcon } from '@jupyterlab/ui-components';
import { ArrowClockwise as RefreshLogo } from 'react-bootstrap-icons';
import ConnectionComponent from './ConnectionComponent';
import { fetchWithCredentials } from '../utils/utils';
import { WebsocketManager } from '../dashboard-widgets/WebsocketManager';
import { BACKEND_API_URL } from '..';

const ChatContainer = (props: {
  notebookId: string;
  websocketManager: WebsocketManager;
}) => {
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    requestConnectedUsers();
  }, []);

  const requestConnectedUsers = async () => {
    const response = await fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${props.notebookId}/connectedstudents`
    );

    if (response.ok) {
      const connectedUsers = await response.json();
      if (connectedUsers) {
        setConnectedUsers(connectedUsers);
        return;
      }
    }
    setConnectedUsers([]);
  };

  const sendMessage = (userId: string) => {
    if (message) {
      props.websocketManager.sendMessageToUser(userId, message);
    }
    setMessage('');
  };

  return (
    <div style={{ width: '100%', padding: '15px' }}>
      <div style={{ display: 'flex', width: '100%', paddingBottom: '15px' }}>
        <div className="chat-title">Chat with Users</div>
        <div className="breadcrumb-buttons-container">
          <Button
            className="dashboard-button"
            onClick={() => requestConnectedUsers()}
          >
            <RefreshLogo className="dashboard-icon" />
          </Button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ width: '100%', maxHeight: '50%', overflowY: 'auto' }}>
          {connectedUsers.map((userId: string) => (
            <ConnectionComponent
              connectionId={userId}
              onClick={() => setSelectedUser(userId)}
            />
          ))}
        </div>
        <div style={{ width: '100%', overflowY: 'auto' }}>
          {selectedUser && (
            <div className="chat-container">
              <div className="chat-with-label">Chat with {selectedUser}</div>
              <div className="chat-input-container">
                <input
                  type="text"
                  placeholder="Send a chat..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="chat-input"
                />
                <button
                  onClick={() => sendMessage(selectedUser)}
                  className="chat-send-button"
                >
                  <runIcon.react elementSize="large" className="send-icon" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;

import { WEBSOCKET_API_URL } from '..';
import { refreshDashboards } from '../redux/reducers/CommonDashboardReducer';
import { AppDispatch, store } from '../redux/store';
import { APP_ID, DASHBOARD_USERNAME_KEY } from '../utils/constants';
import { Socket, io } from 'socket.io-client';

const dispatch = store.dispatch as AppDispatch;

export class WebsocketManager {
  constructor() {
    this._socket = null;
  }

  private _createSocket(notebookId: string, userId: string) {
    this._socket = io(
      `${WEBSOCKET_API_URL}?conType=TEACHER&nbId=${notebookId}&userId=${encodeURIComponent(userId)}`,
      {
        // path: "/api/unilytics/socket.io", // UNCOMMENT THIS IF NEEDED
        transports: ['websocket'] // do not add "polling" as it would require sticky sessions on the load balancer (AWS), which means routing all requests from the same IP to the same instance
      }
    );

    this._socket.on('connect', () => {
      console.log(`${APP_ID}: SocketIO connection opened for:`, {
        notebookId,
        userId
      });
    });

    this._socket.on('disconnect', (event: any) => {
      console.log(
        `${APP_ID}: SocketIO connection closed (reason: ${event}) for:`,
        { notebookId, userId }
      );
    });

    this._socket.on('refreshDashboard', () => {
      dispatch(refreshDashboards());
      console.log(`${APP_ID}: Received refresh dashboard request`);
    });

    this._socket.on('chat', (message: string) => {
      console.log(`${APP_ID}: message received : ${message}`);
    });

    this._socket.on('connect_error', (event: any) => {
      console.error(`${APP_ID}: SocketIO error; `, event);
    });
  }

  public establishSocketConnection(notebookId: string | null) {
    // if there is already a connection, close it and set the socket to null
    this.closeSocketConnection();

    const userId = localStorage.getItem(DASHBOARD_USERNAME_KEY);
    if (!notebookId || !userId) {
      return;
    }
    this._createSocket(notebookId, userId);
  }

  public closeSocketConnection() {
    if (this._socket) {
      this._socket.close();
    }
    this._socket = null;
  }

  public sendMessageToUser(userId: string, message: string) {
    if (this._socket) {
      this._socket.emit('send_message', { userId, message });
    }
  }

  private _socket: Socket | null;
}

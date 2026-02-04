import { Socket, io } from 'socket.io-client';
import { WEBSOCKET_API_URL } from '..';
import { refreshDashboards } from '../redux/reducers/CommonDashboardReducer';
import { AppDispatch, store } from '../redux/store';
import { APP_ID, DASHBOARD_USERNAME_KEY } from '../utils/constants';

const dispatch = store.dispatch as AppDispatch;

export class WebsocketManager {
  constructor() {
    this._socket = null;
    this._lastRefreshTime = 0;
    this._refreshDebounceMs = 3000;
    this._refreshTimeout = null;
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
      const now = Date.now();

      // Clear any pending refresh timeout
      if (this._refreshTimeout) {
        clearTimeout(this._refreshTimeout);
      }

      // If enough time has passed, refresh immediately
      if (now - this._lastRefreshTime >= this._refreshDebounceMs) {
        console.log(
          `${APP_ID}: Received refresh dashboard request - executing immediately`
        );
        this._lastRefreshTime = now;
        dispatch(refreshDashboards());
      } else {
        // Otherwise, schedule a refresh for later
        const remainingTime =
          this._refreshDebounceMs - (now - this._lastRefreshTime);
        console.log(
          `${APP_ID}: Received refresh dashboard request - debouncing for ${remainingTime}ms`
        );

        this._refreshTimeout = setTimeout(() => {
          console.log(`${APP_ID}: Executing debounced refresh`);
          this._lastRefreshTime = Date.now();
          dispatch(refreshDashboards());
          this._refreshTimeout = null;
        }, remainingTime);
      }
    });

    this._socket.on(
      'chat',
      (data: { message: string; sender: string } | string) => {
        // Handle both old string format and new object format
        if (typeof data === 'string') {
          console.log(`${APP_ID}: message received : ${data}`);
        } else {
          console.log(
            `${APP_ID}: message received from ${data.sender}: ${data.message}`
          );
        }
      }
    );

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
    // Clear any pending refresh timeout
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

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
  private _lastRefreshTime: number;
  private _refreshDebounceMs: number;
  private _refreshTimeout: NodeJS.Timeout | null;
}

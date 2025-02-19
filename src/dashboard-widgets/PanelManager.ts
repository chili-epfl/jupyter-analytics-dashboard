import { NotebookPanel } from '@jupyterlab/notebook';
import { ActivityMonitor } from '@jupyterlab/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import {
  APP_ID,
  Selectors,
  TOC_DASHBOARD_RENDER_TIMEOUT
} from '../utils/constants';
import {
  areListsEqual,
  fetchWithCredentials,
  isNotebookValidForVisu
} from '../utils/utils';
import { AppDispatch, store } from '../redux/store';
import { NotebookCell } from '../redux/types';
import { setNotebookCells } from '../redux/reducers/CommonDashboardReducer';
import { RegistrationState, ValidityChecks } from '../utils/interfaces';
import { WebsocketManager } from './WebsocketManager';
import { CompatibilityManager } from '../utils/compatibility';
import { resetNavigationState } from '../redux/reducers/SideDashboardReducer';
import {
  AuthSignal,
  BACKEND_API_URL,
  authSignal,
  setCurrentNotebookId
} from '..';

const dispatch = store.dispatch as AppDispatch;

export class PanelManager {
  constructor() {
    this._panel = null;
    this._monitor = null;

    this._validityChecks = {
      tag: null,
      registered: RegistrationState.LOADING
    };

    this._websocketManager = new WebsocketManager();

    authSignal.registrationStateChanged.connect(
      this._handleRegistrationStateChange,
      this
    );
  }

  private _handleRegistrationStateChange(
    _sender: AuthSignal,
    newState: RegistrationState
  ) {
    this._validityChecks.registered = newState;
    this._panelUpdatedSignal.emit(void 0);
  }

  get validityChecks(): ValidityChecks {
    return this._validityChecks;
  }

  get notebookCells(): string[] | null | undefined {
    return this._notebookCells;
  }

  get websocketManager(): WebsocketManager {
    return this._websocketManager;
  }

  get panel(): NotebookPanel | null {
    return this._panel;
  }

  set panel(value: NotebookPanel | null) {
    // if the panel (or the absence of panel) hasn't changed
    if (this._panel === value) {
      return;
    }

    if (this._panel) {
      this._panel.disposed.disconnect(this._onPanelDisposed, this);
    }

    // reset the notebook_id user for dashboard interaction logging
    setCurrentNotebookId(null);

    // reset validity checks
    this._validityChecks = {
      tag: null,
      registered: RegistrationState.LOADING
    };

    // remove the websocket connection if there's one
    this._websocketManager.closeSocketConnection();

    this._panel = value;
    // emit signal that there was a panel switch
    this._onPanelSwitched();

    if (this._panel) {
      this._panel.disposed.connect(this._onPanelDisposed, this);
    }

    // dispose an old activity monitor if one existed...
    if (this._monitor) {
      this._monitor.dispose();
      this._monitor = null;
    }

    // if there is no panel, update and return...
    if (!this._panel) {
      this._onPanelUpdated();
      return;
    }

    // to make sure the panel hasn't changed by the time the context is ready
    const scopeId = crypto.randomUUID();
    this._ongoingContextId = scopeId;
    // wait for the panel session context to be ready, for the metadata to be available
    // and all the cell nodes to be added to the DOM, required for the toc generation
    this._panel.sessionContext.ready.then(() => {
      if (
        this._ongoingContextId === scopeId &&
        this._panel &&
        !this._panel.isDisposed
      ) {
        // throttle the rendering rate of the table of contents
        this._monitor = new ActivityMonitor({
          signal: this._panel.context.model.contentChanged,
          timeout: TOC_DASHBOARD_RENDER_TIMEOUT
        });
        this._monitor.activityStopped.connect(this._onPanelUpdated, this);

        // check if notebook is tagged and assign the notebook id
        if (isNotebookValidForVisu(this._panel)) {
          const notebookId = CompatibilityManager.getMetadataComp(
            this._panel.model,
            Selectors.notebookId
          );

          setCurrentNotebookId(notebookId);

          this._validityChecks = {
            tag: notebookId,
            registered: RegistrationState.LOADING
          };

          // make backend API call to check if the notebook is registered and if the current user can view its data
          this._performRegistrationCheck();
        }

        this._onPanelUpdated();
      }
    });
  }

  private _performRegistrationCheck() {
    // to make sure the panel hasn't changed by the time the promise resolves
    const scopeId = crypto.randomUUID();
    this._ongoingCheckId = scopeId;

    // check with the backend if the notebook is registered and that the cells match
    let currentRegistrationState = RegistrationState.ERROR;

    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${this._validityChecks.tag}/check`
    )
      .then(res => {
        return res.json();
      })
      .then(data => {
        if (data?.status) {
          if (data.status === 'expired_token') {
            // 401 error
            currentRegistrationState = RegistrationState.EXPIREDTOKEN;
          } else if (data.status === 'not_found') {
            // 404 error
            // no entry found in the Notebook table for the notebook id
            currentRegistrationState = RegistrationState.NOTFOUND;
          } else if (data.status === 'no_user_permission') {
            // 403 error
            currentRegistrationState = RegistrationState.USERNOTAUTHORIZED;
          } else if (data.status === 'success') {
            // 200
            currentRegistrationState = RegistrationState.SUCCESS;
          }
        } else {
          // other errors such as using a fake token
          currentRegistrationState = RegistrationState.INVALIDCREDENTIALS;
        }
      })
      .catch(error => {
        console.log(
          `${APP_ID}: Notebook check fetching error (check your connection).` +
            error
        );
      })
      .finally(() => {
        if (
          this._ongoingCheckId === scopeId &&
          this._panel &&
          !this._panel.isDisposed
        ) {
          this._validityChecks.registered = currentRegistrationState;

          // only establish a socket connection once the notebook passed both the tag and registration checks
          if (this._validityChecks.registered === RegistrationState.SUCCESS) {
            dispatch(resetNavigationState());
            this._websocketManager.establishSocketConnection(
              this._validityChecks.tag
            );
          }
          this._panelUpdatedSignal.emit(void 0);
        }
      });
  }

  private _onPanelDisposed(_panel: NotebookPanel) {
    // when the panel is disposed, dispose from the panel (calling the _panel setter)
    this.panel = null;
  }

  // expose the signal as a public property
  get panelSwitched(): ISignal<PanelManager, void> {
    return this._panelSwitchedSignal;
  }

  private _onPanelSwitched() {
    // emit the signal when the panel is updated
    this._panelSwitchedSignal.emit(void 0);
  }

  // expose the signal as a public property
  get panelUpdated(): ISignal<PanelManager, void> {
    return this._panelUpdatedSignal;
  }

  private _onPanelUpdated() {
    this._updateCellList();

    // emit the signal when the panel is updated
    this._panelUpdatedSignal.emit(void 0);
  }

  // returns true if there is a list and it actually changed
  protected _updateCellList(): boolean {
    const cells = CompatibilityManager.getCellsArrComp(
      this.panel?.model?.cells
    );
    if (cells) {
      const cellList = cells.map(c => c.id);

      if (!areListsEqual(cellList, this._notebookCells)) {
        this._notebookCells = cellList;

        const notebookList: NotebookCell[] = cells.map(c => ({
          id: c.id,
          cellType: c.type
        }));

        // dispatch action for visualization dashboard update
        dispatch(setNotebookCells(notebookList));
        return true;
      }
    } else {
      this._notebookCells = null;
    }
    return false;
  }

  private _panel: NotebookPanel | null;
  // define a signal for panel updates
  private _panelUpdatedSignal = new Signal<PanelManager, void>(this);
  private _panelSwitchedSignal = new Signal<PanelManager, void>(this);
  private _monitor: ActivityMonitor<any, any> | null;
  private _notebookCells: string[] | null | undefined;
  // to define what should be rendered in DashboardPanel
  private _validityChecks: ValidityChecks;
  private _ongoingContextId = '';
  private _ongoingCheckId = '';

  private _websocketManager: WebsocketManager;
}

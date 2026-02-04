import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';
import { INotebookModel, INotebookTracker } from '@jupyterlab/notebook';
import { shareIcon } from '@jupyterlab/ui-components';
import { BACKEND_API_URL, CURRENT_NOTEBOOK_ID } from '..';
import { PanelManager } from '../dashboard-widgets/PanelManager';
import { APP_ID, CommandIDs } from '../utils/constants';
import { fetchWithCredentials } from '../utils/utils';

// Defining the Token for the Plugin Service
import { NotebookPanel } from '@jupyterlab/notebook';
import { Token } from '@lumino/coreutils';
import { addDashboardNotebookExtensions } from '../widget-extensions';
import { IDashboardManager } from './dashboards';

/**
 * The Notebook Update interface Token. A unique identification for the serve this plugin provides. THis is mechanism by which other plugin can use this service.
 */
export interface IPushNotebookService {
  pushCellUpdate(panelManager: PanelManager): Promise<void>;
  pushNotebookUpdate(panelManager: PanelManager): Promise<void>;
}

/**
 * Creating a Juypterlab Token which will uniquely identify the IPushNotebookService interface so that other interface (dashboard) can provide this service through dependency injection.
 */
export const IPushNotebookService = new Token<IPushNotebookService>(
  `${APP_ID}:push-notebook-service` // Using APP_ID so that if app_id is changed it propagates everywhere else.
);

/**
 * Main Service, handles the core functionality of getting notebook or cell content and sending it to the backend. Implements the 2 function defined in the interface
 */
class PushNotebookService implements IPushNotebookService {
  private panelManager: PanelManager;

  constructor(panelManager: PanelManager) {
    this.panelManager = panelManager;
  }

  // allow other plugins (dashboards) to hand us a real PanelManager later
  setPanelManager(panelManager: PanelManager): void {
    // if we already use the same manager, nothing to do
    if (this.panelManager === panelManager) {
      return;
    }
    // close any local websocket connection owned by our current manager to avoid duplicates
    try {
      this.panelManager.websocketManager?.closeSocketConnection();
    } catch (e) {
      console.warn(`${APP_ID}: error closing local websocket`, e);
    }

    console.log('Dashboard Plugin Using the Push Plugin Panel');
    this.panelManager = panelManager;
  }

  // expose current manager so callers (commands) can consult it
  getPanelManager(): PanelManager {
    return this.panelManager;
  }

  async pushCellUpdate(panelManager: PanelManager): Promise<void> {
    const pm = panelManager ?? this.panelManager;
    // use pm below instead of the passed-in panelManager
    const notebookID = CURRENT_NOTEBOOK_ID;

    if (!notebookID) {
      console.error('No notebook id found');
      return;
    }

    const notebook = pm.panel?.content;
    const activeCell = notebook?.activeCell;

    if (activeCell && pm.panel) {
      const cellModel = activeCell?.model;
      if (!cellModel) {
        console.error(`${APP_ID}: No cell model for active cell`);
        return;
      }

      const model = cellModel as any;
      console.log(`${APP_ID}: Pushing cell update - cell_id: ${model.id}`);

      const minimalCell = {
        id: model.id,
        cell_type: model.type,
        source: model.toJSON().source
      };

      const payload = {
        content: minimalCell,
        action: 'update_cell',
        update_id: crypto.randomUUID() // Generate unique update ID
      };

      await this.pushUpdateToStudents(
        this.panelManager,
        JSON.stringify(payload)
      );
    }
  }

  async pushNotebookUpdate(panelManager: PanelManager): Promise<void> {
    const pm = panelManager ?? this.panelManager;

    if (!CURRENT_NOTEBOOK_ID) {
      console.error('No notebook id found');
      return;
    }

    const notebook = pm.panel?.content;
    if (notebook) {
      const model = notebook.model as INotebookModel;
      const content = model.toJSON() as any;

      // Ensure all cells have both id and cell_id
      if (content && content.cells && Array.isArray(content.cells)) {
        content.cells = content.cells.map((cell: any) => ({
          ...cell,
          id: cell.id || cell.cell_id,
          cell_id: cell.cell_id || cell.id
        }));
      }

      const payload = {
        content: content,
        action: 'update_notebook',
        update_id: crypto.randomUUID()
      };

      await this.pushUpdateToStudents(panelManager, JSON.stringify(payload));
    }
  }

  async pushUpdateToStudents(
    panelManager: PanelManager,
    message: any
  ): Promise<void> {
    const pm = panelManager ?? this.panelManager;
    if (!pm.websocketManager) {
      console.error('No websocket manager found');
      return;
    }

    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${CURRENT_NOTEBOOK_ID}/connectedstudents`
    )
      .then(response => response.json())
      .then((studentsList: string[]) => {
        if (studentsList.length === 0) {
          console.log('No connected students');
          return;
        }
        for (const userId of studentsList) {
          panelManager.websocketManager.sendMessageToUser(userId, message);
        }
      });
  }
}

// Exporting the plugin
export const pushNotebookUpdateServicePlugin: JupyterFrontEndPlugin<IPushNotebookService> =
  {
    id: `${APP_ID}:push-notebook-update-service`,
    autoStart: true,
    optional: [IDashboardManager],
    requires: [INotebookTracker, ICommandPalette, ILabShell],
    activate: (
      app: JupyterFrontEnd,
      notebookTracker: INotebookTracker,
      palette: ICommandPalette,
      labShell: ILabShell,
      dashboardManager?: PanelManager
    ): IPushNotebookService => {
      // use injected dashboard manager if available, otherwise create a local one
      console.log(
        `JupyterLab extension ${APP_ID}: pushNotebookUpdate plugins activated!`
      );

      const injectedPM = dashboardManager ?? null;
      const manager = injectedPM ?? new PanelManager();
      const createdLocal = !injectedPM;

      if (createdLocal) {
        //console.log("Cannot find the Dashboard Plugin")
        // wire manager to the shell so the local PanelManager behaves like the dashboard's one
        try {
          // add notebook toolbar/cell buttons (same helper dashboards uses)
          addDashboardNotebookExtensions(app);

          const onConnect = () => {
            const widget = labShell.currentWidget;
            if (!widget) {
              return;
            }
            // only proceed if the new widget is a NotebookPanel
            if (!(widget instanceof NotebookPanel)) {
              if (manager.panel && manager.panel.isDisposed) {
                manager.panel = null;
              }
              return;
            }
            manager.panel = widget as NotebookPanel;
          };

          // hook shell changes and restored
          labShell.currentChanged.connect(onConnect);
          void app.restored.then(() => {
            onConnect();
          });
        } catch (e) {
          console.warn(`${APP_ID}: failed to wire local PanelManager`, e);
        }
      } else {
        console.log('Push Plugin using Dashboard plugin panel');
      }

      const service = new PushNotebookService(manager);

      // expose the push service globally so a later-starting dashboards plugin can use it
      (window as any).__UNIANALYTICS_PUSH_NOTEBOOK_SERVICE = service;

      // Same as the Original Implementation
      app.restored.then(() => {
        app.commands.addCommand(CommandIDs.pushCellUpdate, {
          label: 'Push the Selected Cell',
          caption: 'Share the selected cell with the connected students',
          icon: shareIcon,
          // consult the service's live manager (may be swapped later)
          isVisible: () => service.getPanelManager().panel !== null,
          // rely on service's internal manager by default
          execute: () => service.pushCellUpdate(undefined as any)
        });

        app.contextMenu.addItem({
          type: 'separator',
          selector: '.jp-Notebook'
        });

        app.contextMenu.addItem({
          command: CommandIDs.pushCellUpdate,
          selector: '.jp-Cell'
        });

        // add to command palette for discoverability
        palette.addItem({
          command: CommandIDs.pushCellUpdate,
          category: 'Notebook'
        });
      });

      // if we created a local manager, ensure minimal cleanup (close socket on unload)
      if (createdLocal) {
        window.addEventListener('beforeunload', () => {
          manager.websocketManager?.closeSocketConnection();
        });
      }

      return service;
    }
  };

export default pushNotebookUpdateServicePlugin;

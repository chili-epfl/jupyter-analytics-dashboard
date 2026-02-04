// import { JupyterFrontEnd } from '@jupyterlab/application';
// import { shareIcon } from '@jupyterlab/ui-components';
// import { INotebookModel, INotebookTracker } from '@jupyterlab/notebook';
// import { fetchWithCredentials } from '../utils/utils';
// import { APP_ID, CommandIDs } from '../utils/constants';
// import { BACKEND_API_URL, CURRENT_NOTEBOOK_ID } from '..';
// import { PanelManager } from '../dashboard-widgets/PanelManager';
// import { ICommandPalette} from '@jupyterlab/apputils';
// import { IDashboardManager } from './dashboards';
// import { JupyterFrontEndPlugin } from '@jupyterlab/application';


// export function activatePushNotebookUpdatePlugin(
//   app: JupyterFrontEnd,
//   panelManager: PanelManager
// ) {
//   console.log(
//     `JupyterLab extension ${APP_ID}: push-update plugin is activated!`
//   );

//   app.restored.then(() => {
//     app.commands.addCommand(CommandIDs.pushCellUpdate, {
//       label: 'Push the Selected Cell',
//       caption: 'Share the selected cell with the connected students',
//       icon: shareIcon,
//       isVisible: () => panelManager.panel !== null,
//       execute: () => pushCellUpdate(panelManager)
//     });

//     app.commands.addCommand(CommandIDs.pushNotebookUpdate, {
//       label: 'Push the Whole Notebook',
//       caption: 'Share the whole notebook with the connected students',
//       icon: shareIcon,
//       execute: () => pushNotebookUpdate(panelManager)
//     });

//     app.contextMenu.addItem({
//       type: 'separator',
//       selector: '.jp-Notebook'
//     });

//     app.contextMenu.addItem({
//       command: CommandIDs.pushCellUpdate,
//       selector: '.jp-Cell'
//     });

//     app.contextMenu.addItem({
//       type: 'separator',
//       selector: '.jp-Cell'
//     });

//     app.contextMenu.addItem({
//       command: CommandIDs.pushNotebookUpdate,
//       selector: '.jp-Notebook'
//     });
//   });
// }

// const pushCellUpdate = async (panelManager: PanelManager) => {
//   if (!CURRENT_NOTEBOOK_ID) {
//     console.error('No notebook id found');
//     return;
//   }

//   const notebook = panelManager.panel?.content;
//   const cell = notebook?.activeCell;

//   if (cell) {
//     const model = cell.model;

//     // Use the minimal cell representation
//     const minimalCell = {
//       id: model.id,
//       cell_type: model.type,
//       source: model.toJSON().source
//     };

//     const payload = {
//       content: minimalCell,
//       action: 'update_cell'
//     };

//     await pushUpdateToStudents(panelManager, JSON.stringify(payload));
//   }
// };

// const pushNotebookUpdate = async (panelManager: PanelManager) => {
//   if (!CURRENT_NOTEBOOK_ID) {
//     console.error('No notebook id found');
//     return;
//   }

//   const notebook = panelManager.panel?.content;
//   if (notebook) {
//     const model = notebook.model as INotebookModel;
//     const content = model.toJSON();
//     const payload = {
//       content: content,
//       action: 'update_notebook'
//     };

//     await pushUpdateToStudents(panelManager, JSON.stringify(payload));
//   }
// };

// const pushUpdateToStudents = async (
//   panelManager: PanelManager,
//   message: any
// ) => {
//   if (!panelManager.websocketManager) {
//     console.error('No websocket manager found');
//     return;
//   }

//   fetchWithCredentials(
//     `${BACKEND_API_URL}/dashboard/${CURRENT_NOTEBOOK_ID}/connectedstudents`
//   )
//     .then(response => response.json())
//     .then((studentsList: string[]) => {
//       if (studentsList.length === 0) {
//         console.log('No connected students');
//         return;
//       }
//       for (const userId of studentsList) {
//         panelManager.websocketManager.sendMessageToUser(userId, message);
//       }
//     });
// };

// export const pushNotebookUpdatePlugin: JupyterFrontEndPlugin<void> = {
//   id: `${APP_ID}:push-notebook-update`,
//   autoStart: true,
//   optional: [IDashboardManager],
//   requires: [],
//   activate: (
//     app: JupyterFrontEnd,
//     notebookTracker: INotebookTracker,
//     palette: ICommandPalette,
//     dashboardManager?: PanelManager
//   ) => {
//     // use injected dashboard manager if available, otherwise create a local one
//     const manager = dashboardManager ?? new PanelManager();
//     const createdLocal = !dashboardManager;

//     // wire up commands/context menu using existing helper
//     activatePushNotebookUpdatePlugin(app, manager);

//     // if we created a local manager, ensure minimal cleanup
//     if (createdLocal) {
//       console.log("Dashboard Plugin not available using local Panel Manager")
//       // close websocket when page unloads (or app disposed)
//       window.addEventListener('beforeunload', () => {
//         manager.websocketManager?.closeSocketConnection();
//       });
//     }
//   }
// };

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd
} from '@jupyterlab/application';
import { NotebookPanel } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget } from '@lumino/widgets';

import { analyticsIcon } from '../icons';
import { RegistrationState } from '../utils/interfaces';
import { InteractionRecorder } from '../utils/interactionRecorder';
import { APP_ID, visuIconClass, CommandIDs } from '../utils/constants';
import { store, AppDispatch } from '../redux/store';
import {
  navigateToNotebook,
  navigateToCell
} from '../redux/reducers/SideDashboardReducer';
import { PanelManager } from '../dashboard-widgets/PanelManager';
import { VisuDashboardPanel } from '../dashboard-widgets/VisuDashboardPanel';
import { TocDashboardPanel } from '../dashboard-widgets/TocDashboardPanel';
// import { ChatDashboardPanel } from '../dashboard-widgets/ChatDashboardPanel';
import { PlaybackWidget } from '../dashboard-widgets/PlaybackWidget';
import { addDashboardNotebookExtensions } from '../widget-extensions';
import { activatePushNotebookUpdatePlugin } from './pushNotebookUpdate';

const dispatch = store.dispatch as AppDispatch;

export async function activateDashboardPlugins(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  labShell: ILabShell,
  settings: ISettingRegistry.ISettings | undefined,
  rendermime: IRenderMimeRegistry
) {
  console.log(`JupyterLab extension ${APP_ID}: dashboard plugins activated!`);

  // adds the multiple notebook buttons associated with the dashboards
  addDashboardNotebookExtensions(app);

  // define the object that will track the state of the current panel and expose it to the sidebar widgets
  const panelManager = new PanelManager();

  // initializing sidebar widgets
  const visuDashboardPanel = new VisuDashboardPanel(
    panelManager,
    app.commands,
    rendermime.sanitizer
  );
  const tocDashboardPanel = new TocDashboardPanel(
    panelManager,
    app.commands,
    rendermime.sanitizer,
    settings
  );

  // add the playback widget, hidden by default
  const playbackWidget = new PlaybackWidget(panelManager);
  // only attach the widget after the labShell is ready
  void labShell.restored.then(() => {
    Widget.attach(playbackWidget, labShell.node);
  });

  // const chatDashboardPanel = new ChatDashboardPanel(panelManager);

  // add the plugin to push notebook updates to the connected students
  activatePushNotebookUpdatePlugin(app, panelManager);

  // add the widgets to the sidebars
  labShell.add(visuDashboardPanel, 'right', { rank: 1000 });
  labShell.add(tocDashboardPanel, 'left', { rank: 1000 });
  // labShell.add(chatDashboardPanel, 'right', { rank: 1000 });

  // define commands to open the dashboards
  app.commands.addCommand(CommandIDs.dashboardOpenDashboardPlayback, {
    label: 'Notebook Visualizations',
    // caption = hovering caption
    caption: 'Open Dashboards',
    icon: analyticsIcon,
    iconClass: visuIconClass,
    execute: args => {
      if (args['from'] === 'Playback') {
        if (!visuDashboardPanel.isVisible) {
          // set right dashboard navigation to Notebook page if not opened
          dispatch(navigateToNotebook());
        }
        // open Toc if not visible
        if (!tocDashboardPanel.isVisible) {
          app.shell.activateById(tocDashboardPanel.id);
        }
        // open/close playback component (only if widget is attached and if user has permissions for that notebook)
        if (
          playbackWidget.isAttached &&
          panelManager.validityChecks.registered === RegistrationState.SUCCESS
        ) {
          if (playbackWidget.isHidden) {
            playbackWidget.show();
          } else {
            playbackWidget.hide();
          }
        }
      } else if (args['from'] === 'Cell') {
        InteractionRecorder.sendInteraction({
          click_type: 'ON',
          signal_origin: 'NOTEBOOK_CELL_BUTTON'
        });
        dispatch(
          navigateToCell({
            cellId: args['cell_id'] as string
          })
        );
      } else if (args['from'] === 'Toc') {
        InteractionRecorder.sendInteraction({
          click_type: 'ON',
          signal_origin: 'TOC_OPEN_CELL_DASHBOARD'
        });
        dispatch(
          navigateToCell({
            cellId: args['cell_id'] as string
          })
        );
      }
      // else, keep the current navigationState

      // open the dashboard
      if (!visuDashboardPanel.isVisible) {
        app.shell.activateById(visuDashboardPanel.id);
      }
    }
  });

  // add the command to scroll to a cell
  app.commands.addCommand(CommandIDs.dashboardScrollToCell, {
    label: 'Dashboard Scroll to Cell',
    caption: 'Notebook Cell Navigation from Dashboards',
    execute: args => {
      if (args['from'] === 'Visu') {
        switch (args['source']) {
          case 'CodeExecComponent':
            InteractionRecorder.sendInteraction({
              click_type: 'ON',
              signal_origin: 'CODE_VISU_CLICK'
            });
            break;
          case 'CellDurationComponent':
            InteractionRecorder.sendInteraction({
              click_type: 'ON',
              signal_origin: 'TIME_VISU_CLICK'
            });
            break;
          default:
            console.log(
              `${APP_ID}: dashboardScrollToCell command called from an unknown source.`
            );
        }

        const notebook = panelManager.panel?.content;
        if (!notebook) {
          return;
        }

        const cellIndex = notebook.widgets.findIndex(
          cell => cell.model.id === args['cell_id']
        );
        if (cellIndex !== -1) {
          notebook.activeCellIndex = cellIndex;
          notebook.mode = 'command';
          notebook.scrollToItem(cellIndex, 'center');
        }
      }
    }
  });

  // add the widgets to the restorer
  if (restorer) {
    restorer.add(visuDashboardPanel, `${APP_ID}:dashboard-notebook-restorer`);
    restorer.add(tocDashboardPanel, `${APP_ID}:dashboard-toc-restorer`);
    // restorer.add(chatDashboardPanel, `${APP_ID}:dashboard-chat-restorer`);
  }

  // update the panel when the active widget changes
  if (labShell) {
    labShell.currentChanged.connect(onConnect);
  }

  // connect to current widget
  void app.restored.then(() => {
    onConnect();
  });

  function onConnect() {
    const widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    // only proceed if the new widget is a notebook panel
    if (!(widget instanceof NotebookPanel)) {
      // if the previously used widget is still available, stick with it.
      // otherwise, set the current panel to null.
      if (panelManager.panel && panelManager.panel.isDisposed) {
        panelManager.panel = null;
      }
      return;
    }
    const notebookPanel = widget as NotebookPanel;
    panelManager.panel = notebookPanel;
  }
}

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';
import { CommandIDs } from '../utils/constants';
import { ToolbarButton } from '@jupyterlab/apputils';
import { analyticsReplayIcon } from '../icons';
import { CommandRegistry } from '@lumino/commands';
import { isNotebookValidForVisu } from '../utils/utils';

export class PlaybackButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  private _commands: CommandRegistry;

  constructor(commands: CommandRegistry) {
    this._commands = commands;
  }

  createNew(panel: NotebookPanel): IDisposable {
    const button = new ToolbarButton({
      className: 'playback-button',
      icon: analyticsReplayIcon,
      onClick: () => {
        this._commands.execute(CommandIDs.dashboardOpenDashboardPlayback, {
          from: 'Playback'
        });
        // HERE CHANGE TO OPENING BOTH DASHBOARDS + SHOW THE PLAYBACK WIDGET
      },
      tooltip: 'Open Dashboard Playback Widget'
    });

    panel.context.ready.then(() => {
      if (isNotebookValidForVisu(panel)) {
        panel.toolbar.insertItem(0, 'openDashboardPlayback', button);
      }
    });

    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}

import { Cell, ICellModel } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import { analyticsIcon } from '../icons';
import { CommandRegistry } from '@lumino/commands';
import { CommandIDs } from '../utils/constants';
import { isNotebookValidForVisu } from '../utils/utils';
import { CompatibilityManager } from '../utils/compatibility';

// if changed, adapt in the css too
const CELL_BUTTON_CLASS = 'cell-dashboard-button-container';

class CellButtonWidget extends Widget {
  constructor(commands: CommandRegistry, cell_id: string) {
    super();
    this.addClass(CELL_BUTTON_CLASS);
    const button = document.createElement('button');
    button.className = 'cell-dashboard-button';
    button.innerHTML = analyticsIcon.svgstr;
    // disable the button when there is no notebook id
    button.title = button.disabled
      ? 'No notebook identifier'
      : 'Open Cell Dashboard';
    button.onclick = () => {
      commands.execute(CommandIDs.dashboardOpenDashboardPlayback, {
        from: 'Cell',
        cell_id: cell_id
      });
    };
    this.node.appendChild(button);
  }

  dispose(): void {
    super.dispose();
  }
}

export class CellButton implements DocumentRegistry.WidgetExtension {
  constructor(commands: CommandRegistry) {
    this._commands = commands;
  }

  createNew(panel: NotebookPanel): IDisposable {
    return new CellTracker(panel, this._commands);
  }

  private _commands: CommandRegistry;
}

export class CellTracker implements IDisposable {
  constructor(panel: NotebookPanel, commands: CommandRegistry) {
    this._panel = panel;
    this._commands = commands;
    this._previousActiveCell = this._panel.content.activeCell;

    panel.context.ready.then(() => {
      if (isNotebookValidForVisu(panel)) {
        // only add to the notebook's active cell (if any) once it has fully rendered and been revealed.
        void panel.revealed.then(() => {
          if (panel && !panel.isDisposed) {
            // wait one frame (at 60 fps) for the panel to render the first cell, then display if possible.
            setTimeout(() => {
              this._onActiveCellChanged(panel.content);
            }, 1000 / 60);
          }
        });

        // check whether the toolbar should be rendered upon a layout change
        panel.content.renderingLayoutChanged.connect(
          this._onActiveCellChanged,
          this
        );

        // handle subsequent changes of active cell.
        panel.content.activeCellChanged.connect(
          this._onActiveCellChanged,
          this
        );

        panel.disposed.connect(() => {
          panel.content.activeCellChanged.disconnect(this._onActiveCellChanged);
        });
      } else {
        this.dispose();
      }
    });
  }

  private _addCellButton(model: ICellModel): void {
    const cell = this._getCell(model);

    if (cell) {
      const cellButtonWidget = new CellButtonWidget(
        this._commands,
        cell.model.id
      );

      (cell.layout as PanelLayout).insertWidget(0, cellButtonWidget);
    }
  }

  _onActiveCellChanged(notebook: Notebook): void {
    if (this._previousActiveCell && !this._previousActiveCell.isDisposed) {
      // disposed cells do not have a model anymore.
      this._removeCellButton(this._previousActiveCell.model);
    }

    const activeCell = notebook.activeCell;
    if (activeCell === null) {
      return;
    }

    this._addCellButton(activeCell.model);
    this._previousActiveCell = activeCell;
  }

  private _getCell(model: ICellModel): Cell | undefined {
    return this._panel?.content.widgets.find(widget => widget.model === model);
  }

  private _removeCellButton(model: ICellModel): void {
    const cell = this._getCell(model);
    if (cell) {
      this._findCellButtonWidgets(cell).forEach(widget => {
        widget.dispose();
      });
    }
  }

  private _findCellButtonWidgets(cell: Cell): Widget[] {
    const widgets = (cell.layout as PanelLayout).widgets;

    // search for header using the CSS class or use the first one if not found.
    return widgets.filter(widget => widget.hasClass(CELL_BUTTON_CLASS)) || [];
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    const cells = CompatibilityManager.getCellsArrComp(
      this._panel?.context.model.cells
    );
    if (cells) {
      for (const model of cells) {
        this._removeCellButton(model);
      }
    }

    this._panel = null;

    Signal.clearData(this);
  }

  private _isDisposed = false;
  private _panel: NotebookPanel | null;
  private _commands: CommandRegistry;
  private _previousActiveCell: Cell<ICellModel> | null;
}

import { ISignal, Signal } from '@lumino/signaling';
import { NotebookPanel } from '@jupyterlab/notebook';
import { TocDashboardPanel } from '../../dashboard-widgets/TocDashboardPanel';
import { IOptionsManager, ICollapseChangedArgs } from '../../utils/interfaces';
import { IRenderMime } from '@jupyterlab/rendermime';
import { CompatibilityManager } from '../../utils/compatibility';

interface IOptions {
  numbering: boolean;

  numberingH1: boolean;

  syncCollapseState: boolean;

  sanitizer: IRenderMime.ISanitizer;
}

class OptionsManager extends IOptionsManager {
  constructor(widget: TocDashboardPanel, options: IOptions) {
    super();
    this._numbering = options.numbering;
    this._numberingH1 = options.numberingH1;
    this._syncCollapseState = options.syncCollapseState;
    this._widget = widget;
    this.sanitizer = options.sanitizer;
    this._collapseChanged = new Signal<this, ICollapseChangedArgs>(this);
  }

  readonly sanitizer: IRenderMime.ISanitizer;

  set numberingH1(value: boolean) {
    if (this._numberingH1 !== value) {
      this._numberingH1 = value;
      this._widget.update();
    }
  }

  get numberingH1() {
    return this._numberingH1;
  }

  set syncCollapseState(value: boolean) {
    if (this._syncCollapseState !== value) {
      this._syncCollapseState = value;
      this._widget.update();
    }
  }

  get syncCollapseState() {
    return this._syncCollapseState;
  }

  private setNotebookMetadata(
    value: [string, any],
    panel: NotebookPanel | null
  ) {
    if (panel !== null) {
      if (panel.model) {
        CompatibilityManager.setMetadataComp(panel.model, value[0], value[1]);
      }
    }
  }

  public setNumbering(value: boolean, panel: NotebookPanel | null) {
    this._numbering = value;
    this._widget.update();
    this.setNotebookMetadata(
      ['dashboard-toc-autonumbering', this._numbering],
      panel
    );
  }

  get numbering() {
    return this._numbering;
  }

  public setShowCode(value: boolean, panel: NotebookPanel | null) {
    this._showCode = value;
    this.setNotebookMetadata(['dashboard-toc-showcode', this._showCode], panel);
    this._widget.update();
  }

  get showCode() {
    return this._showCode;
  }

  public setShowMarkdown(value: boolean, panel: NotebookPanel | null) {
    this._showMarkdown = value;
    this.setNotebookMetadata(
      ['dashboard-toc-showmarkdowntxt', this._showMarkdown],
      panel
    );
    this._widget.update();
  }

  get showMarkdown() {
    return this._showMarkdown;
  }

  get collapseChanged(): ISignal<this, ICollapseChangedArgs> {
    return this._collapseChanged;
  }

  set preRenderedToolbar(value: any) {
    this._preRenderedToolbar = value;
  }

  get preRenderedToolbar() {
    return this._preRenderedToolbar;
  }

  updateWidget() {
    this._widget.update();
  }

  updateAndCollapse(args: ICollapseChangedArgs) {
    this._collapseChanged.emit(args);
    this._widget.update();
  }

  initializeOptions(
    numbering: boolean,
    numberingH1: boolean,
    syncCollapseState: boolean,
    showCode: boolean,
    showMarkdown: boolean
  ) {
    this._numbering = numbering;
    this._numberingH1 = numberingH1;
    this._syncCollapseState = syncCollapseState;
    this._showCode = showCode;
    this._showMarkdown = showMarkdown;
    this._widget.update();
  }

  private _preRenderedToolbar: any = null;
  private _numbering: boolean;
  private _numberingH1: boolean;
  private _syncCollapseState: boolean;
  private _showCode = false;
  private _showMarkdown = false;
  private _widget: TocDashboardPanel;
  private _collapseChanged: Signal<this, ICollapseChangedArgs>;
}

export { OptionsManager };

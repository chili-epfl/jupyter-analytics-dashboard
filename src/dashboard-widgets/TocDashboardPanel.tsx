import * as React from 'react';
import { Message } from '@lumino/messaging';
import { CommandRegistry } from '@lumino/commands';
import DashboardPanel from './DashboardPanel';
import { PanelManager } from './PanelManager';
import { PathExt } from '@jupyterlab/coreutils';
import TocDashboardTree from '../toc-dashboard/tocDashboardTree';
import { IGenerator } from '../utils/interfaces';
import { ToolbarComponent } from '../toc-dashboard/generator/toolbar_generator';
import { IRenderMime } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { createNotebookGenerator } from '../toc-dashboard/generator';
import { analyticsIcon } from '../icons';
import { InteractionRecorder } from '../utils/interactionRecorder';
import ExportCSVButton from '../toc-dashboard/ExportCSVButton';

export class TocDashboardPanel extends DashboardPanel {
  constructor(
    panelManager: PanelManager,
    commands: CommandRegistry,
    sanitizer: IRenderMime.ISanitizer,
    settings: ISettingRegistry.ISettings | undefined
  ) {
    super(panelManager);

    this.title.caption = 'Dashboard ToC';
    this.title.icon = analyticsIcon;
    this.id = 'unianalytics-toc-dashboard';
    this.node.setAttribute('role', 'region');
    this.node.setAttribute('aria-label', 'Dashboard ToC section');

    this._commands = commands;

    this._notebookGenerator = createNotebookGenerator(
      this,
      sanitizer,
      settings
    );
    this._toolbar = null;

    panelManager.panelSwitched.connect(this._onPanelSwitched, this);
  }

  // to record when users show/hide the dashboard
  protected onBeforeShow(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'ON',
      signal_origin: 'TOC_DASHBOARD_SHOW_HIDE'
    });
  }
  protected onBeforeHide(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'OFF',
      signal_origin: 'TOC_DASHBOARD_SHOW_HIDE'
    });
  }

  // update the object used to generate the toc content and the toolbar
  private _onPanelSwitched(sender: PanelManager) {
    if (this._panelManager.panel) {
      this._toolbar = this._notebookGenerator.toolbarGenerator(
        this._panelManager.panel
      );
    } else {
      this._toolbar = null;
    }
  }

  protected computeComponentToRender(): React.ReactElement {
    const panel = this._panelManager.panel;
    if (panel) {
      return (
        <div className="dashboard-TableOfContents">
          <div className="dashboard-stack-panel-header">
            <span className="dashboard-toc-header-title">
              {PathExt.basename(panel.context.localPath)}
            </span>
            <ExportCSVButton
              notebookId={this._panelManager.validityChecks.tag}
            />
          </div>
          {this._toolbar && <this._toolbar />}
          <TocDashboardTree
            headings={this._notebookGenerator.generate(panel)}
            itemRenderer={this._notebookGenerator.itemRenderer}
            notebookPanel={panel}
            commands={this._commands}
            notebookCells={this._panelManager.notebookCells}
          />
        </div>
      );
    } else {
      return <></>;
    }
  }

  private _commands: CommandRegistry;
  private _notebookGenerator: IGenerator;
  private _toolbar: ToolbarComponent | null;
}

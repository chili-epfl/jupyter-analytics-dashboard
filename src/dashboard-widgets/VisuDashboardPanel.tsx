import * as React from 'react';
import { Message } from '@lumino/messaging';
import { CommandRegistry } from '@lumino/commands';
import DashboardPanel from './DashboardPanel';
import { PanelManager } from './PanelManager';
import PageRouter from '../side-dashboard/PageRouter';
import { analyticsIcon } from '../icons';
import { IRenderMime } from '@jupyterlab/rendermime';
import { InteractionRecorder } from '../utils/interactionRecorder';

export class VisuDashboardPanel extends DashboardPanel {
  constructor(
    panelManager: PanelManager,
    commands: CommandRegistry,
    sanitizer: IRenderMime.ISanitizer
  ) {
    super(panelManager);

    this.addClass('dashboard-react-widget');

    this.title.caption = 'Side Dashboard';
    this.title.icon = analyticsIcon;
    this.id = 'unanalytics-side-dashboard';
    this.node.setAttribute('role', 'region');
    this.node.setAttribute('aria-label', 'Side dashboard section');

    this._commands = commands;
    this._sanitizer = sanitizer;
  }

  // to record when users show/hide the dashboard
  protected onBeforeShow(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'ON',
      signal_origin: 'RIGHT_DASHBOARD_SHOW_HIDE'
    });
  }
  protected onBeforeHide(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'OFF',
      signal_origin: 'RIGHT_DASHBOARD_SHOW_HIDE'
    });
  }

  protected computeComponentToRender(): React.ReactElement {
    const panel = this._panelManager.panel;
    const notebookId = this._panelManager.validityChecks.tag;
    if (panel && notebookId) {
      return (
        <PageRouter
          notebookId={notebookId}
          notebookName={panel.sessionContext.name}
          commands={this._commands}
          sanitizer={this._sanitizer}
        />
      );
    } else {
      return <></>;
    }
  }

  private _commands: CommandRegistry;
  private _sanitizer: IRenderMime.ISanitizer;
}

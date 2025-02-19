import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { PanelManager } from './PanelManager';
import { Message } from '@lumino/messaging';
import { InteractionRecorder } from '../utils/interactionRecorder';
import PlaybackComponent from '../playback/PlaybackComponent';

export class PlaybackWidget extends ReactWidget {
  constructor(panelManager: PanelManager) {
    super();

    this.addClass('dashboard-playback-widget');

    this.id = 'dashboard-playback-widget';
    this.node.setAttribute('role', 'region');

    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.update = this.update.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    // start with widget hidden
    this.hide();

    this._panelManager = panelManager;

    panelManager.panelUpdated.connect(() => this.update());
    panelManager.panelSwitched.connect(() => this.hide());
  }

  // to record when users show/hide the dashboard
  protected onBeforeShow(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'ON',
      signal_origin: 'DASHBOARD_PLAYBACK_SHOW_HIDE'
    });
    this.update();
  }

  protected onBeforeHide(msg: Message): void {
    InteractionRecorder.sendInteraction({
      click_type: 'OFF',
      signal_origin: 'DASHBOARD_PLAYBACK_SHOW_HIDE'
    });
    this.update();
  }

  protected onUpdateRequest(msg: Message): void {
    // this calls render() through the parent class
    super.onUpdateRequest(msg);
  }

  render(): JSX.Element {
    const panel = this._panelManager.panel;
    const notebookId = this._panelManager.validityChecks.tag;
    if (!this.isHidden && panel && notebookId) {
      return (
        <PlaybackComponent
          notebookId={notebookId}
          hideParent={() => this.hide()}
        />
      );
    } else {
      return <></>;
    }
  }

  // methods to enable horizontal dragging of the rendered element
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('mousedown', this._onMouseDown.bind(this));
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mousedown', this._onMouseDown.bind(this));
    super.onBeforeDetach(msg);
  }

  private _onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    } // only left mouse button
    if (event.target !== this.node) {
      return;
    } // check if the target is the current node and not children nodes

    this._dragging = true;
    this._startX = event.clientX;
    this._startLeft = this.node.offsetLeft;

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  private _onMouseMove(event: MouseEvent): void {
    if (!this._dragging) {
      return;
    }

    const deltaX = event.clientX - this._startX;
    this.node.style.left = `${this._startLeft + deltaX}px`;
  }

  private _onMouseUp(event: MouseEvent): void {
    this._dragging = false;

    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  protected _panelManager: PanelManager;

  private _dragging: boolean = false;
  private _startX: number = 0;
  private _startLeft: number = 0;
}

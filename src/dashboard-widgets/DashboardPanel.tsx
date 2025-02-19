import { Message } from '@lumino/messaging';
import { ReactWidget } from '@jupyterlab/apputils';
import * as React from 'react';
import { Provider } from 'react-redux';
import { PanelManager } from './PanelManager';
import { store } from '../redux/store';
import Loader from '../side-dashboard/components/placeholder/Loader';
import SidebarPlaceholder from '../side-dashboard/components/placeholder/SidebarPlaceholder';
import { RegistrationState } from '../utils/interfaces';

// abstract class implementing the notebook tag and registration checks and the resulting rendering for both side panel dashboards
abstract class DashboardPanel extends ReactWidget {
  constructor(panelManager: PanelManager) {
    super();

    this.addClass('dashboard-panel');

    this._panelManager = panelManager;

    panelManager.panelUpdated.connect(() => this.update(), this);
  }

  protected onAfterShow(msg: Message): void {
    this.update();
  }

  // to record when users show/hide the dashboards
  protected abstract onBeforeShow(msg: Message): void;
  protected abstract onBeforeHide(msg: Message): void;

  protected onUpdateRequest(msg: Message): void {
    // this calls render() through the parent class
    super.onUpdateRequest(msg);
  }

  // define the displayed component in each children class implementation
  protected abstract computeComponentToRender(): React.ReactElement;

  /*
    conditional rendering of the side panel components :
    if panel :
      if panel ready : 
        if notebook is tagged :
          switch : 
            notebook is registered : 
              show visualizations
            other : 
              placeholder with result of registration check
        else : 
          placeholder 
      else : 
        loading...
    else : 
      placeholder
  */
  render(): JSX.Element {
    if (this._panelManager.panel) {
      if (this._panelManager.panel.context.isReady) {
        if (this._panelManager.validityChecks.tag) {
          // render the approriate component depending on the registration check outcome (or if it's still not resolved/loading)
          switch (this._panelManager.validityChecks.registered) {
            case RegistrationState.LOADING:
              return <Loader />;
            case RegistrationState.SUCCESS:
              return (
                <Provider store={store}>
                  {this.computeComponentToRender()}
                </Provider>
              );
            default: // NOTFOUND or EXPIREDTOKEN or INVALIDCREDENTIALS or ERROR
              return (
                <SidebarPlaceholder
                  title={this._panelManager.validityChecks.registered as string}
                />
              );
          }
        } else {
          return (
            <SidebarPlaceholder title={'Notebook not Tagged for Tracking'} />
          );
        }
      } else {
        return <Loader />;
      }
    } else {
      return (
        <SidebarPlaceholder
          title={'No Notebook'}
          placeholderText={'Open a notebook to start viewing its content.'}
        />
      );
    }
  }

  protected _panelManager: PanelManager;
}

export default DashboardPanel;

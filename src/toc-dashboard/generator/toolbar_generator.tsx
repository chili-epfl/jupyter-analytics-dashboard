import { NotebookPanel } from '@jupyterlab/notebook';
import {
  codeIcon,
  markdownIcon,
  numberingIcon,
  refreshIcon
} from '@jupyterlab/ui-components';
import { hideIcon, showIcon } from '../../icons';
import * as React from 'react';
import { OptionsManager } from './options_manager';

import { store, AppDispatch } from '../../redux/store';
import {
  setDisplayHideDashboard,
  initialToCDashboardState
} from '../../redux/reducers/ToCDashboardReducer';
import { refreshDashboards } from '../../redux/reducers/CommonDashboardReducer';
import { CompatibilityManager } from '../../utils/compatibility';
import { InteractionRecorder } from '../../utils/interactionRecorder';

const dispatch = store.dispatch as AppDispatch;

type IProperties = Record<string, never>;

interface IState {
  showCode: boolean;

  showMarkdown: boolean;

  numbering: boolean;

  showVisuDashboard: boolean;
}

export type ToolbarComponent = React.ComponentType<IProperties>;

function toolbar(
  options: OptionsManager,
  panel: NotebookPanel
): ToolbarComponent {
  return class Toolbar extends React.Component<IProperties, IState> {
    constructor(props: IProperties) {
      super(props);
      this.state = {
        showCode: true,
        showMarkdown: false,
        numbering: false,
        showVisuDashboard: initialToCDashboardState.displayDashboard
      };

      // read saved user settings in notebook metadata:
      void panel.context.ready.then(() => {
        if (panel) {
          panel.content.activeCellChanged.connect(() => {
            options.updateWidget();
          });
          const numbering = CompatibilityManager.getMetadataComp(
            panel.model,
            'dashboard-toc-autonumbering'
          ) as boolean;
          const showCode = CompatibilityManager.getMetadataComp(
            panel.model,
            'dashboard-toc-showcode'
          ) as boolean;
          const showMarkdown = CompatibilityManager.getMetadataComp(
            panel.model,
            'dashboard-toc-showmarkdowntxt'
          ) as boolean;
          options.initializeOptions(
            numbering || options.numbering,
            options.numberingH1,
            options.syncCollapseState,
            showCode || options.showCode,
            showMarkdown || options.showMarkdown
          );
          this.setState({
            showCode: options.showCode,
            showMarkdown: options.showMarkdown,
            numbering: options.numbering
          });
        }
      });
    }

    toggleCode() {
      InteractionRecorder.sendInteraction({
        click_type: !options.showCode ? 'ON' : 'OFF',
        signal_origin: 'TOC_TOOLBAR_CODE'
      });
      options.setShowCode(!options.showCode, panel);
      this.setState({ showCode: options.showCode });
    }

    toggleMarkdown() {
      InteractionRecorder.sendInteraction({
        click_type: !options.showMarkdown ? 'ON' : 'OFF',
        signal_origin: 'TOC_TOOLBAR_MARKDOWN'
      });
      options.setShowMarkdown(!options.showMarkdown, panel);
      this.setState({ showMarkdown: options.showMarkdown });
    }

    toggleNumbering() {
      InteractionRecorder.sendInteraction({
        click_type: !options.numbering ? 'ON' : 'OFF',
        signal_origin: 'TOC_TOOLBAR_NUMBERED'
      });
      options.setNumbering(!options.numbering, panel);
      this.setState({ numbering: options.numbering });
    }

    toggleShowVisuDashboard() {
      // dispatch show/hide the dashboard component action
      const showVisuDashboard = this.state.showVisuDashboard;

      InteractionRecorder.sendInteraction({
        click_type: !showVisuDashboard ? 'ON' : 'OFF',
        signal_origin: 'TOC_TOOLBAR_SHOW_HIDE'
      });
      dispatch(setDisplayHideDashboard(!showVisuDashboard));
      this.setState({ showVisuDashboard: !showVisuDashboard });
    }

    refreshDashboard() {
      InteractionRecorder.sendInteraction({
        click_type: 'ON',
        signal_origin: 'TOC_TOOLBAR_REFRESH'
      });
      // dispatch refresh action
      dispatch(refreshDashboards());
    }

    render() {
      const codeToggleIcon = (
        <div
          onClick={event => this.toggleCode()}
          role="text"
          aria-label={'Toggle Code Cells'}
          title={'Toggle Code Cells'}
          className={
            this.state.showCode
              ? 'dashboard-toc-toolbar-icon-selected'
              : 'dashboard-toc-toolbar-icon'
          }
        >
          <codeIcon.react />
        </div>
      );

      const markdownToggleIcon = (
        <div
          onClick={event => this.toggleMarkdown()}
          role="text"
          aria-label={'Toggle Markdown Text Cells'}
          title={'Toggle Markdown Text Cells'}
          className={
            this.state.showMarkdown
              ? 'dashboard-toc-toolbar-icon-selected'
              : 'dashboard-toc-toolbar-icon'
          }
        >
          <markdownIcon.react />
        </div>
      );

      const numberingToggleIcon = (
        <div
          onClick={event => this.toggleNumbering()}
          role="text"
          aria-label={'Toggle Auto-Numbering'}
          title={'Toggle Auto-Numbering'}
          className={
            this.state.numbering
              ? 'dashboard-toc-toolbar-icon-selected'
              : 'dashboard-toc-toolbar-icon'
          }
        >
          <numberingIcon.react />
        </div>
      );

      const showVisuDashboardToggleIcon = (
        <div
          onClick={event => this.toggleShowVisuDashboard()}
          role="text"
          aria-label={
            this.state.showVisuDashboard
              ? 'Hide Visualization Dashboard'
              : 'Show Visualization Dashboard'
          }
          title={
            this.state.showVisuDashboard
              ? 'Hide Visualization Dashboard'
              : 'Show Visualization Dashboard'
          }
          className={'dashboard-toc-toolbar-icon'}
        >
          {this.state.showVisuDashboard ? (
            <hideIcon.react />
          ) : (
            <showIcon.react />
          )}
        </div>
      );

      const refreshButtonIcon = (
        <div
          onClick={event => this.refreshDashboard()}
          role="text"
          aria-label={'Refresh Dashboard'}
          title={'Refresh Dashboard'}
          className={'dashboard-toc-toolbar-icon'}
        >
          <refreshIcon.react />
        </div>
      );

      return (
        <div>
          <div className={'dashboard-toc-toolbar'}>
            <div className="dashboard-toc-toolbar-compartment">
              {codeToggleIcon}
              {markdownToggleIcon}
              {numberingToggleIcon}
            </div>
            <div className={'dashboard-toc-toolbar-compartment'}>
              {showVisuDashboardToggleIcon}
              {refreshButtonIcon}
            </div>
          </div>
        </div>
      );
    }
  };
}

export { toolbar };

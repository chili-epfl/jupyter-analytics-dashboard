import * as React from 'react';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { OptionsManager } from './options_manager';
import { INotebookHeading } from '../../utils/headings';
import {
  sanitizerOptions,
  MARKDOWN_HEADING_COLLAPSED,
  UNSYNC_MARKDOWN_HEADING_COLLAPSED
} from './utils';
import CellInput from '../../side-dashboard/components/cell/CellInput';
import { CompatibilityManager } from '../../utils/compatibility';
import { InteractionRecorder } from '../../utils/interactionRecorder';

function render(
  options: OptionsManager,
  panel: NotebookPanel,
  item: INotebookHeading,
  headings: INotebookHeading[] = []
) {
  // markdown headings
  if (item.type === 'markdown' || item.type === 'header') {
    let fontSizeClass = 'dashboard-toc-level-size-default';
    const numbering = item.numbering && options.numbering ? item.numbering : '';
    const cellCollapseMetadata = options.syncCollapseState
      ? MARKDOWN_HEADING_COLLAPSED
      : UNSYNC_MARKDOWN_HEADING_COLLAPSED;
    // to add some indentation for markdown content
    if (item.type === 'header' || item.type === 'markdown') {
      fontSizeClass = 'dashboard-toc-level-size-' + item.level;
    }

    // generate the rendered element depending on the heading type
    if (item.type === 'header' || options.showMarkdown) {
      let jsx;
      if (item.html) {
        // sanitize if it is HTML
        jsx = (
          <span
            dangerouslySetInnerHTML={{
              __html:
                numbering +
                options.sanitizer.sanitize(item.html, sanitizerOptions)
            }}
            className={
              'dashboard-' + item.type + '-cell dashboard-toc-cell-item'
            }
          />
        );
      } else {
        jsx = (
          <span
            className={
              'dashboard-' + item.type + '-cell dashboard-toc-cell-item'
            }
          >
            {numbering + item.text}
          </span>
        );
      }
      // render the headers
      let button = null;
      if (item.type === 'header') {
        button = (
          <div
            className="jp-Collapser p-Widget lm-Widget"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(panel, cellCollapseMetadata, item);
            }}
          >
            <div className="dashboard-toc-Collapser-child" />
          </div>
        );
      }

      // render the heading item
      jsx = (
        <div
          className={
            'dashboard-toc-entry-holder ' +
            fontSizeClass +
            (panel.content.activeCell === item.cellRef
              ? ' dashboard-toc-active-cell'
              : previousHeader(panel, item, headings)
                ? ' dashboard-toc-active-cell'
                : '')
          }
        >
          {button}
          {jsx}
        </div>
      );

      return jsx;
    }
    return null;
  }
  // code headings
  if (panel && item.type === 'code' && options.showCode) {
    // render code cells

    // if undefined, display as text
    const language_mimetype =
      CompatibilityManager.getMetadataComp(panel.model, 'language_info')
        ?.mimetype || 'text';
    return (
      <div className="dashboard-toc-code-cell-div">
        <div className="dashboard-toc-code-cell-prompt">{item.prompt}</div>
        <span className={'dashboard-toc-code-span'}>
          <CellInput
            cell_input={item.text}
            language_mimetype={language_mimetype}
            className="dashboard-toc-cell-input"
          />
        </span>
      </div>
    );
  }
  return null;

  function onClick(
    panel: NotebookPanel,
    cellCollapseMetadata: string,
    heading?: INotebookHeading
  ) {
    let collapsed = false;
    const syncCollapseState = options.syncCollapseState;
    const collapsedValue = CompatibilityManager.getMetadataComp(
      heading?.cellRef.model,
      cellCollapseMetadata
    );
    if (collapsedValue) {
      collapsed = collapsedValue as boolean;
    }

    if (heading) {
      InteractionRecorder.sendInteraction({
        click_type: collapsed ? 'OFF' : 'ON',
        signal_origin: 'TOC_COLLAPSE_HEADERS'
      });
      if (syncCollapseState) {
        // if collapse state is synced, update state here
        if (panel) {
          NotebookActions.setHeadingCollapse(
            heading?.cellRef,
            !collapsed,
            panel.content
          );
        }
      } else {
        if (collapsed) {
          CompatibilityManager.deleteMetadataComp(
            heading.cellRef.model,
            cellCollapseMetadata
          );
        } else {
          CompatibilityManager.setMetadataComp(
            heading.cellRef.model,
            cellCollapseMetadata,
            true
          );
        }
      }
      options.updateAndCollapse({
        heading: heading,
        collapsedState: collapsed
      });
    } else {
      options.updateWidget();
    }
  }
}

function previousHeader(
  panel: NotebookPanel,
  item: INotebookHeading,
  headings: INotebookHeading[]
) {
  if (item.index > -1 || headings?.length) {
    const activeCellIndex = panel.content.activeCellIndex;
    const headerIndex = item.index;
    // header index has to be less than the active cell index
    if (activeCellIndex && headerIndex < activeCellIndex) {
      const tocIndexOfNextHeader = headings.indexOf(item) + 1;
      // return true if header is the last header
      if (tocIndexOfNextHeader >= headings.length) {
        return true;
      }
      // return true if the next header cells index is greater than the active cells index
      const nextHeaderIndex = headings?.[tocIndexOfNextHeader].index;
      if (nextHeaderIndex > activeCellIndex) {
        return true;
      }
    }
  }
  return false;
}

export { render };

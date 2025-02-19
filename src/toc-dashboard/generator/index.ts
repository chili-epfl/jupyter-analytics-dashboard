import { Cell, CodeCell, CodeCellModel, MarkdownCell } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import { IRenderMime } from '@jupyterlab/rendermime';
import { INotebookHeading } from '../../utils/headings';
import { OptionsManager } from './options_manager';
import { render } from './render';
import { toolbar } from './toolbar_generator';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { TocDashboardPanel } from '../../dashboard-widgets/TocDashboardPanel';
import { IGenerator } from '../../utils/interfaces';
import {
  getCodeCellHeading,
  getLastHeadingLevel,
  appendHeading,
  getMarkdownHeadings,
  appendMarkdownHeading,
  getRenderedHTMLHeadings,
  MARKDOWN_HEADING_COLLAPSED,
  UNSYNC_MARKDOWN_HEADING_COLLAPSED
} from './utils';
import { CompatibilityManager } from '../../utils/compatibility';

function createNotebookGenerator(
  widget: TocDashboardPanel,
  sanitizer: IRenderMime.ISanitizer,
  settings?: ISettingRegistry.ISettings
): IGenerator {
  let numberingH1 = true;
  let syncCollapseState = false;
  if (settings && settings.composite.tocDashboardSettings) {
    numberingH1 = (settings.composite.tocDashboardSettings as any)
      .numberingH1 as boolean;
    syncCollapseState = (settings.composite.tocDashboardSettings as any)
      .syncCollapseState as boolean;
  }
  const options = new OptionsManager(widget, {
    numbering: false,
    numberingH1: numberingH1,
    syncCollapseState: syncCollapseState,
    sanitizer: sanitizer
  });
  if (settings && settings.composite.tocDashboardSettings) {
    settings.changed.connect(() => {
      options.numberingH1 = (settings.composite.tocDashboardSettings as any)
        .numberingH1 as boolean;
      options.syncCollapseState = (
        settings.composite.tocDashboardSettings as any
      ).syncCollapseState as boolean;
    });
  }

  return {
    options: options,
    toolbarGenerator: generateToolbar,
    itemRenderer: renderItem,
    generate: generate,
    collapseChanged: options.collapseChanged
  };

  function generateToolbar(panel: NotebookPanel) {
    return toolbar(options, panel);
  }

  function renderItem(
    panel: NotebookPanel,
    item: INotebookHeading,
    headings: INotebookHeading[] = []
  ) {
    return render(options, panel, item, headings);
  }

  function generate(panel: NotebookPanel): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let collapseLevel = -1;
    const dict = {};

    // initialize a variable for keeping track of the previous heading:
    let prev: INotebookHeading | null = null;

    // generate headings by iterating through all notebook cells
    for (let i = 0; i < panel.content.widgets.length; i++) {
      const cell: Cell = panel.content.widgets[i];
      const model = cell.model;
      const cellCollapseMetadata = options.syncCollapseState
        ? MARKDOWN_HEADING_COLLAPSED
        : UNSYNC_MARKDOWN_HEADING_COLLAPSED;
      let collapsed = CompatibilityManager.getMetadataComp(
        model,
        cellCollapseMetadata
      ) as boolean;
      // convert undefined to false if it is
      collapsed = collapsed || false;

      if (model.type === 'code') {
        if (!widget || (widget && options.showCode)) {
          const onClick = (line: number) => {
            return () => {
              panel.content.activeCellIndex = i;
              cell.node.scrollIntoView();
            };
          };
          const count = (cell as CodeCell).model.executionCount as
            | number
            | null;
          const executionCount = count !== null ? '[' + count + ']: ' : '[ ]: ';
          const heading = getCodeCellHeading(
            (model as CodeCellModel).sharedModel.getSource(),
            onClick,
            executionCount,
            getLastHeadingLevel(headings),
            cell,
            i
          );
          [headings, prev] = appendHeading(
            headings,
            heading,
            prev,
            collapseLevel
          );
        }

        continue;
      }
      if (model.type === 'markdown') {
        const mcell = cell as MarkdownCell;
        let heading: INotebookHeading | undefined;
        const lastLevel = getLastHeadingLevel(headings);

        // if the cell is rendered, generate the ToC items from the HTML...
        if (mcell.rendered && !mcell.inputHidden) {
          const onClick = (el: Element) => {
            return () => {
              if (!mcell.rendered) {
                panel.content.activeCellIndex = i;
                el.scrollIntoView();
              } else {
                panel.content.mode = 'command';
                cell.node.scrollIntoView();
                panel.content.activeCellIndex = i;
              }
            };
          };
          const htmlHeadings = getRenderedHTMLHeadings(
            cell.node,
            onClick,
            sanitizer,
            dict,
            lastLevel,
            options.numbering,
            options.numberingH1,
            cell,
            i
          );
          for (heading of htmlHeadings) {
            [headings, prev, collapseLevel] = appendMarkdownHeading(
              heading,
              headings,
              prev,
              collapseLevel,
              collapsed,
              options.showMarkdown
            );
          }
          // if not rendered, generate ToC items from the cell text...
        } else {
          const onClick = (line: number) => {
            return () => {
              panel.content.activeCellIndex = i;
              cell.node.scrollIntoView();
            };
          };
          const markdownHeadings = getMarkdownHeadings(
            model.sharedModel.getSource(),
            onClick,
            dict,
            lastLevel,
            cell,
            i
          );
          for (heading of markdownHeadings) {
            [headings, prev, collapseLevel] = appendMarkdownHeading(
              heading,
              headings,
              prev,
              collapseLevel,
              collapsed,
              options.showMarkdown
            );
          }
        }
      }
    }
    return headings;
  }
}

export { createNotebookGenerator };

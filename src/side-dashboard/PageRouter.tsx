import React, { useCallback, useState } from 'react';
import TopBreadcrumb from './components/layout/TopBreadcrumb';
import Notebook from './pages/Notebook';
import Cell from './pages/Cell';

import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { IRenderMime } from '@jupyterlab/rendermime';

// register needed for react-chartjs-2 to work
import { Chart, registerables } from 'chart.js';
import { PAGE_CONTAINER_ELEMENT_ID } from '../utils/constants';
Chart.register(...registerables);

interface IRouterProps {
  notebookId: string;
  notebookName: string;
  sanitizer: IRenderMime.ISanitizer;
}

const PageRouter = (props: IRouterProps): JSX.Element => {
  // state for conditional rendering
  const navigationState = useSelector(
    (state: RootState) => state.sidedashboard.navigationState
  );

  const [pageRouterNode, setPageRouterNode] = useState<HTMLDivElement | null>(
    null
  );
  const ref = useCallback((node: HTMLDivElement | null) => {
    setPageRouterNode(node);
  }, []);

  return (
    <div ref={ref} className="page-container" id={PAGE_CONTAINER_ELEMENT_ID}>
      <TopBreadcrumb />
      {/* immediately invoked function expression (IIFE) : */}
      {(() => {
        const currentPage = navigationState[navigationState.length - 1];
        switch (currentPage.pageName) {
          case 'Notebook':
            return (
              <Notebook
                notebookId={props.notebookId}
                notebookName={props.notebookName}
              />
            );
          case 'Cell':
            return (
              <Cell
                notebookId={props.notebookId}
                sanitizer={props.sanitizer}
                pageRouterNode={pageRouterNode}
              />
            );
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default PageRouter;

import React, { useState, useEffect, useRef } from 'react';
import { ButtonGroup, Form, Row, ToggleButton } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { CellLayer } from '../../redux/types';
import { IRenderMime } from '@jupyterlab/rendermime';
import {
  fetchWithCredentials,
  generateQueryArgsString
} from '../../utils/utils';
import { BACKEND_API_URL } from '../..';
import InfiniteScroll from 'react-infinite-scroll-component';
import { APP_ID, PAGE_CONTAINER_ELEMENT_ID } from '../../utils/constants';
import Loader from '../components/placeholder/Loader';
import SortDropDown from '../components/buttons/SortDropDown';
import GroupDropDown from '../components/buttons/GroupDropDown';
import TimeDropDown from '../components/buttons/TimeDropDown';
import { InteractionRecorder } from '../../utils/interactionRecorder';
import ExecutionComponent from '../components/cell/ExecutionComponent';
import MarkdownComponent from '../components/cell/MarkdownComponent';
import CellInput from '../components/cell/CellInput';
import CellOutput from '../components/cell/CellOutput';

interface ICellPageProps {
  notebookId: string;
  sanitizer: IRenderMime.ISanitizer;
  pageRouterNode: HTMLDivElement | null;
}

// function to wait for a small delay before updating the value of the filter box input state value
const useDebouncedFilterText = (
  delay = 800
): [string, React.Dispatch<React.SetStateAction<string>>] => {
  const [search, setSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const delayFn = setTimeout(() => setSearch(searchQuery), delay);
    return () => clearTimeout(delayFn);
  }, [searchQuery, delay]);

  return [search, setSearchQuery];
};

const filterData = (data: any[], searchTerm: string): any[] => {
  if (searchTerm.length === 0) {
    return data;
  }
  searchTerm = searchTerm.toLowerCase();
  return data.filter((item: any) => {
    return (
      item.cell_input?.toLowerCase().includes(searchTerm) ||
      (item.cell_output_model &&
        JSON.stringify(item.cell_output_model)
          .toLowerCase()
          .includes(searchTerm))
    );
  });
};

const DEFAULT_LIMIT = 7;

const Cell = (props: ICellPageProps): JSX.Element => {
  const dataRef = useRef<any[]>([]);
  const [dataState, setDataState] = useState<any[]>([]);

  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const limitRef = useRef(DEFAULT_LIMIT);

  const requestVersionRef = useRef(0);

  const navigationState = useSelector(
    (state: RootState) => state.sidedashboard.navigationState
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );
  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );

  // filter header content

  const [showInputs, setShowInputs] = useState<boolean>(true);
  const [showOutputs, setShowOutputs] = useState<boolean>(true);

  const [radioValue, setRadioValue] = useState<number>(1);

  // value that waits for a small delay before updating to avoid updating after every keystroke
  const [inputFilterText, setInputFilterText] = useDebouncedFilterText();

  const executionFilters = [
    { name: 'All', value: 1, status: 'all' },
    { name: 'Success', value: 2, status: 'ok' },
    { name: 'Error', value: 3, status: 'error' }
  ];
  const filterStatus = executionFilters.map(filter => filter.status);

  const deepMergeOnExecId = (arr1: any[], arr2: any[]) => {
    const existingIds = new Set(arr1.map(item => item.exec_id));
    const filteredArr2 = arr2.filter(item => !existingIds.has(item.exec_id));
    return [...arr1, ...filteredArr2];
  };

  const content = (navigationState[navigationState.length - 1] as CellLayer)
    .content;

  const fetchDataLazyLoading = async () => {
    const currentVersion = ++requestVersionRef.current;
    const limit = limitRef.current;
    const offset = offsetRef.current;

    try {
      const response = await fetchWithCredentials(
        `${BACKEND_API_URL}/dashboard/${props.notebookId}/cell/${
          content.cellId
        }?limit=${limit}&offset=${offset}&${generateQueryArgsString(
          dashboardQueryArgsRedux,
          props.notebookId
        )}`
      );

      const data = await response.json();

      // make sure the last fetch request is used
      if (currentVersion === requestVersionRef.current) {
        const mergedData = deepMergeOnExecId(dataRef.current, data);
        dataRef.current = mergedData;
        setDataState(mergedData);
        if (data.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        offsetRef.current += limit;
        limitRef.current = DEFAULT_LIMIT; // reset the limit to the default limit
      }
    } catch (error) {
      console.error(`${APP_ID}: Error cell dashboard fetch: `, error);
    }
  };

  useEffect(() => {
    // reset values
    // set nb of fetched rows to the offset to avoid auto-scroll back up on refreshes or fetch requests while being scrolled down
    limitRef.current = Math.max(dataRef.current.length, DEFAULT_LIMIT);
    setHasMore(false);
    offsetRef.current = 0;
    dataRef.current = [];

    fetchDataLazyLoading();
  }, [navigationState, dashboardQueryArgsRedux, refreshRequired]);

  // callback to clear the data when changing notebook
  useEffect(() => {
    return () => {
      setHasMore(false);
      offsetRef.current = 0;
      dataRef.current = [];
      setDataState([]);
    };
  }, [navigationState]);

  // useEffect to trigger a re-fetch in case the value of a filter that's not affecting the redux state changed (e.g. showInputs, showOutputs, etc), or when the partially fetched data does not fill the scrollable area so there might be some more data to fetch
  useEffect(() => {
    if (!props.pageRouterNode) {
      return;
    }

    // test if at the bottom of the pageRouterNode (scrollTop is decimal, hence the approximation)
    const isBottomScroll =
      Math.abs(
        props.pageRouterNode.scrollHeight -
          props.pageRouterNode.clientHeight -
          props.pageRouterNode.scrollTop
      ) < 1;

    // if there is more data to fetch while there is not enough elements to fill up the scroll height or all the way to the bottom of the page-container, fetch again
    if (hasMore && isBottomScroll) {
      fetchDataLazyLoading();
    }
  }, [
    hasMore,
    props.pageRouterNode,
    dataState,
    showInputs,
    showOutputs,
    radioValue,
    inputFilterText
  ]);

  return (
    <>
      <div className="dashboard-title-container">
        <div className="dashboard-title-text">Cell ({content.cellId})</div>
        <div className="dashboard-dropdown-container">
          <SortDropDown notebookId={props.notebookId} />
          <GroupDropDown notebookId={props.notebookId} />
          <TimeDropDown notebookId={props.notebookId} />
        </div>
      </div>
      {/* Filter Bar */}
      <Form
        className="cell-filter-container"
        onSubmit={e => e.preventDefault()} // avoid refreshing the browser window
      >
        <div className="cell-radio-container">
          <ButtonGroup size="sm">
            <ToggleButton
              style={{ marginRight: '3px' }}
              key="0"
              id="code-checkbox"
              type="radio"
              variant="outline-primary"
              value="Code"
              checked={showInputs}
              onClick={event => {
                if (showInputs && !showOutputs) {
                  // Prevent unchecking both checkboxes
                  event.preventDefault();
                } else {
                  InteractionRecorder.sendInteraction({
                    click_type: showInputs ? 'OFF' : 'ON',
                    signal_origin: 'CELL_DASHBOARD_FILTER_CODE_INPUT'
                  });
                  setShowInputs(!showInputs);
                }
              }}
            >
              Code
            </ToggleButton>
            <ToggleButton
              key="1"
              id="output-checkbox"
              type="radio"
              variant="outline-primary"
              value="Output"
              checked={showOutputs}
              onClick={event => {
                if (!showInputs && showOutputs) {
                  // prevent unchecking both checkboxes
                  event.preventDefault();
                } else {
                  InteractionRecorder.sendInteraction({
                    click_type: showOutputs ? 'OFF' : 'ON',
                    signal_origin: 'CELL_DASHBOARD_FILTER_CODE_OUTPUT'
                  });
                  setShowOutputs(!showOutputs);
                }
              }}
            >
              Output
            </ToggleButton>
          </ButtonGroup>
        </div>
        <div className="cell-radio-container">
          <ButtonGroup size="sm">
            {executionFilters.map((execFilter, idx) => (
              <ToggleButton
                key={idx}
                id={`filter-${idx}`}
                type="radio"
                variant="outline-primary"
                name="radio"
                value={execFilter.value}
                checked={radioValue === execFilter.value}
                onChange={e => {
                  InteractionRecorder.sendInteraction({
                    click_type: 'ON',
                    signal_origin: 'CELL_DASHBOARD_FILTER_EXECUTION'
                  });
                  setRadioValue(Number(e.currentTarget.value));
                }}
              >
                {execFilter.name}
              </ToggleButton>
            ))}
          </ButtonGroup>
        </div>
        <Form.Control
          size="sm"
          type="text"
          placeholder="Type text to filter..."
          onChange={e => setInputFilterText(e.target.value)}
        />
      </Form>
      {/* Cell Executions */}
      <InfiniteScroll
        style={{ overflow: 'hidden' }}
        scrollableTarget={PAGE_CONTAINER_ELEMENT_ID} // detect scrolling of the side dashboard panel, which is the parent component
        dataLength={dataState.length}
        next={fetchDataLazyLoading}
        hasMore={hasMore}
        loader={<Loader />}
      >
        {filterData(dataState, inputFilterText).map(
          (value: { [key: string]: any }, index: number) => {
            return (
              <Row key={index}>
                {/* for markdown executions, consider that the execution status is 'ok', not an error */}
                {value.cell_type === 'MarkdownExecution' &&
                ['all', 'ok'].includes(filterStatus[radioValue - 1]) ? (
                  <ExecutionComponent
                    value={value}
                    index={index}
                    ExecutionContent={
                      <MarkdownComponent
                        markdownContent={value.cell_input}
                        sanitizer={props.sanitizer}
                      />
                    }
                  />
                ) : (
                  <>
                    {(radioValue === 1 ||
                      filterStatus[radioValue - 1] === value.status) && (
                      <ExecutionComponent
                        value={value}
                        index={index}
                        ExecutionContent={
                          <>
                            {showInputs && (
                              <CellInput
                                cell_input={value.cell_input}
                                language_mimetype={value.language_mimetype}
                                className="cell-content-container"
                              />
                            )}
                            {showInputs &&
                              showOutputs &&
                              value.cell_output_model.length > 0 && <br />}
                            {showOutputs &&
                              value.cell_output_model.length > 0 && (
                                <CellOutput
                                  cell_output_model={value.cell_output_model}
                                />
                              )}
                          </>
                        }
                      />
                    )}
                  </>
                )}
              </Row>
            );
          }
        )}
      </InfiniteScroll>
    </>
  );
};

export default Cell;

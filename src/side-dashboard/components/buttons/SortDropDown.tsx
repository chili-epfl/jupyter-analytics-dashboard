import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { SortUp as SortLogo } from 'react-bootstrap-icons';
import { InteractionRecorder } from '../../../utils/interactionRecorder';
import { store, AppDispatch, RootState } from '../../../redux/store';
import { setSortBy } from '../../../redux/reducers/CommonDashboardReducer';
import { useSelector } from 'react-redux';

export const DropdownSortingValues = [
  // default value
  {
    key: 'timeDesc',
    label: 'Time (newest 1st)'
  },
  {
    key: 'timeAsc',
    label: 'Time (oldest 1st)'
  },
  {
    key: 'inputAsc',
    label: 'Input (shortest 1st)'
  },
  {
    key: 'inputDesc',
    label: 'Input (longest 1st)'
  },
  {
    key: 'outputAsc',
    label: 'Output (shortest 1st)'
  },
  {
    key: 'outputDesc',
    label: 'Output (longest 1st)'
  }
];

const DEFAULT_SORTING_KEY = DropdownSortingValues[0].key;

const dispatch = store.dispatch as AppDispatch;

const SortDropDown = (props: { notebookId: string }): JSX.Element => {
  // use the sortBy criterion stored in redux or the default one
  const sortByCriterionRedux: string = useSelector(
    (state: RootState) =>
      state.commondashboard.dashboardQueryArgs.sortBy[props.notebookId] ||
      DEFAULT_SORTING_KEY
  );

  return (
    <Dropdown
      id="order-by-dropdown"
      onSelect={eventKey => {
        if (eventKey) {
          InteractionRecorder.sendInteraction({
            click_type: 'ON',
            signal_origin: 'CELL_DASHBOARD_FILTER_SORT'
          });
          dispatch(
            setSortBy({
              notebookId: props.notebookId,
              sortCriterion: eventKey
            })
          );
        }
      }}
      className="custom-dropdown"
    >
      <Dropdown.Toggle className="dashboard-button">
        {sortByCriterionRedux !== DEFAULT_SORTING_KEY && ( // if not default value, display a red dot to notify the user
          <span className="dashboard-filter-red-dot" />
        )}
        <SortLogo className="dashboard-icon" />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>Sort cells by</Dropdown.Header>
        <Dropdown.Divider />
        {DropdownSortingValues.map(
          (sortingValue: { key: string; label: string }, index: number) => {
            return (
              <Dropdown.Item
                id={`sort-item-${index}`}
                eventKey={sortingValue.key}
                className={`${sortByCriterionRedux === sortingValue.key ? 'highlighted' : ''}`}
              >
                {sortingValue.label}
              </Dropdown.Item>
            );
          }
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default SortDropDown;

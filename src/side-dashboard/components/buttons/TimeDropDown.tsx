import React, { useEffect, useState } from 'react';
import { Dropdown, ButtonGroup, ToggleButton, Form } from 'react-bootstrap';
import { CalendarWeek as TimeLogo } from 'react-bootstrap-icons';
import { store, AppDispatch, RootState } from '../../../redux/store';
import {
  setDashboardQueryArgsDisplayRealTime,
  setDashboardQueryArgsT1
} from '../../../redux/reducers/CommonDashboardReducer';
import { InteractionRecorder } from '../../../utils/interactionRecorder';
import { convertToLocaleString } from '../../../utils/utils';
import { useSelector } from 'react-redux';

const dispatch = store.dispatch as AppDispatch;

const RadioTimeFilterValues = [
  { value: 1, displayName: 'All Data', disabledDatePicker: true },
  {
    value: 2,
    displayName: 'From t<sub>1</sub>',
    disabledDatePicker: false
  }
];

const TimeDropDown = (props: { notebookId: string }): JSX.Element => {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const queryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );

  // compute the initial values for the component states from the redux stored values
  const computeRadioValue = () => {
    const index = queryArgsRedux.t1ISOString[props.notebookId] ? 1 : 0;
    return RadioTimeFilterValues[index];
  };

  const computeT1 = (): Date => {
    const t1FromRedux = queryArgsRedux.t1ISOString[props.notebookId];
    if (t1FromRedux) {
      return new Date(t1FromRedux);
    } else {
      return new Date();
    }
  };

  const computeRealTimeValue = (): boolean => {
    // by default, set to true
    if (queryArgsRedux.displayRealTime[props.notebookId] === undefined) {
      return true;
    } else {
      return queryArgsRedux.displayRealTime[props.notebookId];
    }
  };

  const [radioFilterValue, setRadioFilterValue] = useState(computeRadioValue());

  const [t1, setT1] = useState<Date>(computeT1());

  const [realTimeChecked, setRealTimeChecked] =
    useState<boolean>(computeRealTimeValue);

  const currentDateString = convertToLocaleString(new Date());

  // useEffect that runs whenever the time filter changes to trigger a refetch
  useEffect(() => {
    dispatch(
      setDashboardQueryArgsT1({
        notebookId: props.notebookId,
        t1ISOString: radioFilterValue.disabledDatePicker
          ? null
          : t1.toISOString()
      })
    );
    dispatch(
      setDashboardQueryArgsDisplayRealTime({
        notebookId: props.notebookId,
        displayRealTime: realTimeChecked
      })
    );
  }, [t1, radioFilterValue, realTimeChecked]);

  const toggleMenu = () => {
    InteractionRecorder.sendInteraction({
      click_type: showDropdown ? 'OFF' : 'ON',
      signal_origin: 'DASHBOARD_FILTER_TIME'
    });
    if (!showDropdown) {
      // opening the dropdown with the correct states (either current date or previously selected dates)
      setT1(computeT1());
      setRadioFilterValue(computeRadioValue());
      setRealTimeChecked(computeRealTimeValue());
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <Dropdown
      show={showDropdown}
      onToggle={toggleMenu}
      className="custom-dropdown"
    >
      <Dropdown.Toggle className="dashboard-button">
        {!(realTimeChecked && radioFilterValue.disabledDatePicker) && ( // if not default value, display a red dot to notify the user
          <span className="dashboard-filter-red-dot" />
        )}
        <TimeLogo className="dashboard-icon" />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Header>Data Timeframe Selector</Dropdown.Header>
        <Dropdown.Divider />

        <div className="custom-dropdown-container custom-dropdown-item">
          <Form.Check
            id="time-checkbox-include-all"
            type="checkbox"
            label="Only show active users"
            checked={realTimeChecked}
            onChange={e => setRealTimeChecked(e.target.checked)}
          />
        </div>

        <Dropdown.Divider />

        <div className="dashboard-calendar-container">
          <div className="cell-radio-container">
            <ButtonGroup size="sm">
              {RadioTimeFilterValues.map((radioValue, idx) => (
                <ToggleButton
                  key={`calendar-filter-${idx}`}
                  id={`calendar-filter-${idx}`}
                  type="radio"
                  variant="outline-primary"
                  name="radio"
                  value={radioValue.value}
                  checked={radioFilterValue.value === radioValue.value}
                  onChange={(e: any) => {
                    setRadioFilterValue(
                      RadioTimeFilterValues[Number(e.currentTarget.value) - 1]
                    );
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{ __html: radioValue.displayName }}
                  />
                </ToggleButton>
              ))}
            </ButtonGroup>
          </div>
        </div>
        <div className="dashboard-calendar-container">
          <div
            className={`dashboard-calendar-input-wrapper ${radioFilterValue.disabledDatePicker ? 'disabled' : ''}`}
          >
            <div>
              t<sub>1</sub>
            </div>
            <input
              className="dashboard-calendar-input"
              type="datetime-local"
              value={convertToLocaleString(t1)}
              onChange={e => setT1(new Date(e.target.value))}
              max={currentDateString}
            />
          </div>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default TimeDropDown;

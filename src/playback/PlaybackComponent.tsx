import React, { useEffect, useRef, useState } from 'react';
import { setDashboardQueryArgsT2 } from '../redux/reducers/CommonDashboardReducer';
import { store, AppDispatch } from '../redux/store';
import { Form, Button } from 'react-bootstrap';
import { analyticsReplayIcon } from '../icons';
import { X as CloseLogo } from 'react-bootstrap-icons';
import {
  convertToCompactLocaleString,
  convertToLocaleString
} from '../utils/utils';

const dispatch = store.dispatch as AppDispatch;

const NB_SLIDER_STEPS = 40;

// function to wait for a small delay before updating the value to batch refetch requests together
const useDebouncedValue = (
  initialValue: number,
  delay = 200 // in ms
): [number, React.Dispatch<React.SetStateAction<number>>] => {
  const [debouncedValue, setDebouncedValue] = useState<number>(initialValue);
  const [value, setValue] = useState<number>(initialValue);

  useEffect(() => {
    const delayFn = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(delayFn);
  }, [value, delay]);

  return [debouncedValue, setValue];
};

const PlaybackComponent = (props: {
  hideParent: () => void;
  notebookId: string;
}) => {
  // to trigger showPicker() event on the input element from the t1/t2 buttons
  const t1InputRef = useRef<HTMLInputElement>(null);
  const t2InputRef = useRef<HTMLInputElement>(null);

  const currentDate = new Date();

  const [minTime, setMinTime] = useState(
    new Date(currentDate.getTime() - 2 * 60 * 60 * 1000)
  ); // remove 2h
  const [maxTime, setMaxTime] = useState(
    new Date(currentDate.getTime() + 60 * 1000)
  ); // add 1 min

  const [selectedValue, setSelectedValue] = useState<number>(NB_SLIDER_STEPS);
  const [debouncedValue, setDebouncedValue] =
    useDebouncedValue(NB_SLIDER_STEPS);

  const handleSetValues = (value: number) => {
    setSelectedValue(value);
    setDebouncedValue(value);
  };

  // compute the time corresponding to the slider value considering the current minTime and maxTime values
  const computeSelectedTime = (): Date => {
    const selectedTimeMs =
      minTime.getTime() +
      (selectedValue / NB_SLIDER_STEPS) *
        (maxTime.getTime() - minTime.getTime());

    return new Date(selectedTimeMs);
  };

  // dispatch the selected time (returns maxTime at initialization) whenever the slider value changes or t1/t2 are changed
  useEffect(() => {
    const selectedTime = computeSelectedTime();
    dispatch(
      setDashboardQueryArgsT2({
        notebookId: props.notebookId,
        t2ISOString: selectedTime.toISOString()
      })
    );
  }, [debouncedValue, minTime, maxTime]);

  // to ensure the t2 filter value is cleared when playback component is disposed
  useEffect(() => {
    return () => {
      dispatch(
        setDashboardQueryArgsT2({
          notebookId: props.notebookId,
          t2ISOString: null
        })
      );
    };
  }, [props.notebookId]);

  // handle changes in t1 datepicker
  const handleT1Change = (e: any) => {
    const newMinTime = new Date(e.target.value);
    if (newMinTime.getTime() >= maxTime.getTime()) {
      // ensure minTime is always smaller than maxTime
      setMaxTime(new Date(newMinTime.getTime() + 60 * 1000)); // add a min
    }
    setMinTime(newMinTime);
  };

  // handle changes in t2 datepicker
  const handleT2Change = (e: any) => {
    const newMaxTime = new Date(e.target.value);
    if (newMaxTime.getTime() <= minTime.getTime()) {
      // ensure maxTime is always greater than minTime
      setMinTime(new Date(newMaxTime.getTime() - 60 * 1000)); // remove a min
    }
    setMaxTime(newMaxTime);
  };

  return (
    <div className="dashboard-playback-widget-container">
      <div className="dashboard-playback-header">
        <div className="dashboard-playback-icon-container">
          <analyticsReplayIcon.react className="dashboard-playback-icon" />
        </div>
        <div className="dashboard-playback-mode-title">Playback Mode</div>

        <div
          className="dashboard-playback-icon-container-hovering dashboard-playback-icon-container"
          onClick={props.hideParent}
        >
          <CloseLogo className="dashboard-playback-icon" />
        </div>
      </div>
      <div className="dashboard-playback-mode-text">
        Move data cutoff time back in custom range (includes non-active users):
      </div>
      <div className="dashboard-playback-controls">
        <div className="dashboard-playback-time-button-wrapper">
          <Button
            className="dashboard-playback-time-button-container"
            onClick={() => t1InputRef.current?.showPicker()} // to open the hidden datepicker input
          >
            t<sub>1</sub>
            <input
              ref={t1InputRef}
              id="unianalytics-datetime-t1"
              className="dashboard-playback-hidden-datepicker dashboard-calendar-input"
              type="datetime-local"
              value={convertToLocaleString(minTime)}
              max={convertToLocaleString(maxTime)}
              onChange={handleT1Change}
            />
          </Button>
          <span className="dashboard-playback-label">
            Min cutoff:
            <br /> {convertToCompactLocaleString(minTime)}
          </span>
        </div>
        <div className="dashboard-playback-range-wrapper">
          <Form.Range
            min={0}
            max={NB_SLIDER_STEPS}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleSetValues(parseInt(event.target.value))
            }
            value={selectedValue}
          />
          <span className="dashboard-playback-label">
            Selected cutoff:
            <br /> {convertToCompactLocaleString(computeSelectedTime())}
          </span>
        </div>

        <div className="dashboard-playback-time-button-wrapper">
          <Button
            className="dashboard-playback-time-button-container"
            onClick={() => t2InputRef.current?.showPicker()} // to open the hidden datepicker input
          >
            t<sub>2</sub>
            <input
              ref={t2InputRef}
              id="unianalytics-datetime-t2"
              className="dashboard-playback-hidden-datepicker dashboard-calendar-input"
              type="datetime-local"
              value={convertToLocaleString(maxTime)}
              max={convertToLocaleString(currentDate)}
              onChange={handleT2Change}
            />
          </Button>
          <span className="dashboard-playback-label">
            Max cutoff:
            <br /> {convertToCompactLocaleString(maxTime)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlaybackComponent;

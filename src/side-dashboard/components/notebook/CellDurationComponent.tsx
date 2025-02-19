import React, { useEffect, useState } from 'react';
import { BubbleDataPoint, ChartData } from 'chart.js';
import ChartContainer from './ChartContainer';
import { Bubble } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
  fetchWithCredentials,
  generateQueryArgsString
} from '../../../utils/utils';
import { BACKEND_API_URL } from '../../..';
import { NotebookCell } from '../../../redux/types';
import {
  MAX_DURATION_TIME,
  cellDurationOptions
} from '../../../utils/chartOptions';

// extend the Chart.js point definition to pass additional properties and use them in the tooltip labels
interface ICustomPoint extends BubbleDataPoint {
  x: number;
  y: number;
  r: number;
  userCount: number;
  totalCount: number;
}

const CellDurationComponent = (props: { notebookId: string }) => {
  const [cellDurationData, setCellDurationData] = useState<ChartData<'bubble'>>(
    {
      labels: [],
      datasets: []
    }
  );

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );
  const notebookCells = useSelector(
    (state: RootState) => state.commondashboard.notebookCells
  );

  // fetching execution data
  useEffect(() => {
    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${props.notebookId}/user_cell_duration_time?${generateQueryArgsString(dashboardQueryArgsRedux, props.notebookId)}`
    )
      .then(response => response.json())
      .then((data: any) => {
        const durations = data.durations;
        const total_user_count = data.total_user_count;
        const dataPointValues: ICustomPoint[] = [];
        if (durations && total_user_count) {
          notebookCells?.map((cell: NotebookCell, index: number) => {
            const foundData = durations.find(
              (item: any) => item.cell === cell.id
            );
            if (foundData) {
              const ratio = foundData.user_count / total_user_count;
              const min = 1,
                max = 10;

              dataPointValues.push({
                x: index + 1,
                y: Math.min(foundData.average_duration, MAX_DURATION_TIME), // only consider durations under the max duration time
                r: Math.min(
                  Math.max(Math.round(min + (max - 1) * ratio), min),
                  max // scale the ball radius to the number of users, and bound it with min and max
                ),
                userCount: foundData.user_count,
                totalCount: total_user_count
              });
            }
          });
        }

        const chartData: ChartData<'bubble'> = {
          labels: notebookCells
            ? Array.from(
                { length: notebookCells.length },
                (_, index) => index + 1
              )
            : [],
          datasets: [
            {
              label: ' fraction of users that focused on the cell',
              data: dataPointValues,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }
          ]
        };
        setCellDurationData(chartData);
      });
  }, [dashboardQueryArgsRedux, refreshRequired]);

  return (
    <ChartContainer
      PassedComponent={
        <Bubble data={cellDurationData} options={cellDurationOptions} />
      }
      title="Time spent on each cell across users"
    />
  );
};

export default CellDurationComponent;

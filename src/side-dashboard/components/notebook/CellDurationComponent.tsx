import React, { useEffect, useRef, useState } from 'react';
import { BubbleDataPoint, ChartData, ChartOptions } from 'chart.js';
import ChartContainer from './ChartContainer';
import { Bubble } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { NotebookCell } from '../../../redux/types';
import {
  fetchWithCredentials,
  generateQueryArgsString
} from '../../../utils/utils';
import { BACKEND_API_URL } from '../../..';
import { CommandIDs } from '../../../utils/constants';
import { baseChartOptions } from '../../../utils/chartOptions';

import { CommandRegistry } from '@lumino/commands';

// extend the Chart.js point definition to pass additional properties and use them in the tooltip labels
interface ICustomPoint extends BubbleDataPoint {
  x: number;
  y: number;
  r: number;
  userCount: number;
  totalCount: number;
}

const CellDurationComponent = (props: {
  notebookId: string;
  commands: CommandRegistry;
}) => {
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

  const notebookCellsRef = useRef<typeof notebookCells | null>(null);

  const handleCellClick = (cellId: string) => {
    props.commands.execute(CommandIDs.dashboardScrollToCell, {
      from: 'Visu',
      source: 'CellDurationComponent',
      cell_id: cellId
    });
  };

  useEffect(() => {
    notebookCellsRef.current = notebookCells;
  }, [notebookCells]);

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

  const cellDurationOptions = getCellDurationOptions(
    notebookCellsRef,
    handleCellClick
  );

  return (
    <ChartContainer
      PassedComponent={
        <Bubble data={cellDurationData} options={cellDurationOptions} />
      }
      title="Time spent on each cell across users"
    />
  );
};

const MAX_DURATION_TIME = 1800; // in seconds, 1800s = 30min
const OVER_MAX_DURATION_STR = `> ${Math.floor(MAX_DURATION_TIME / 60)}'`;

const getCellDurationOptions = (
  notebookCellsRef: React.RefObject<NotebookCell[] | null>,
  onClickCell: (cellId: string) => void
): ChartOptions<'bubble'> => ({
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      ...baseChartOptions.plugins?.legend,
      display: true,
      labels: {
        ...baseChartOptions.plugins?.legend?.labels,
        usePointStyle: true
      }
    },
    tooltip: {
      ...baseChartOptions.plugins?.tooltip,
      usePointStyle: true,
      callbacks: {
        title: (tooltipItem: any) => `Cell ${tooltipItem[0].raw.x}`,
        label: (tooltipItem: any) => [
          `${tooltipItem.raw.userCount} of ${tooltipItem.raw.totalCount} users focused on this cell`,
          `Average focus time: ${formatTime(tooltipItem.raw.y)}`
        ]
      }
    }
  },
  scales: {
    x: {
      ...baseChartOptions.scales?.x,
      type: 'category' as const,
      title: {
        ...baseChartOptions.scales?.x?.title,
        text: 'Cell (markdown & code)'
      }
    },
    y: {
      ...baseChartOptions.scales?.y,
      // max: MAX_DURATION_TIME + Math.floor(0.1 * MAX_DURATION_TIME), // don't display durations > MAX_DURATION_TIME, and add some margin above the y-axis
      // grace: 20, // to add additional padding top and bottom of y-axis
      ticks: {
        ...baseChartOptions.scales?.y?.ticks,
        count: 6,
        callback: (value: string | number) =>
          typeof value === 'number' ? formatTime(value) : value
      },
      title: {
        ...baseChartOptions.scales?.y?.title,
        text: 'Average time spent on the cell'
      }
    }
  },
  onClick: (_event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const cellId = notebookCellsRef.current?.[index]?.id;
      if (cellId) {
        onClickCell(cellId);
      }
    }
  }
});

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;

  if (seconds >= MAX_DURATION_TIME) {
    return OVER_MAX_DURATION_STR;
  } else {
    return `${minutes > 0 ? minutes + "'" : ''}${secondsLeft.toFixed(0)}"`;
  }
};

export default CellDurationComponent;

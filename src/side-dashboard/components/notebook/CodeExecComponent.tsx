import React, { useEffect, useMemo, useState } from 'react';
import { ChartData, ChartOptions } from 'chart.js';
import ChartContainer from './ChartContainer';
import { Bar } from 'react-chartjs-2';
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

const CodeExecComponent = (props: {
  notebookId: string;
  commands: CommandRegistry;
}) => {
  const [codeExecData, setCodeExecData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: []
  });

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );
  const notebookCells = useSelector(
    (state: RootState) => state.commondashboard.notebookCells
  );

  // filter elements of notebookCells that are of type 'code'
  const codeCells = useMemo(() => {
    return notebookCells?.filter(cell => cell.cellType === 'code') || [];
  }, [notebookCells]);

  const handleCellClick = (cellId: string) => {
    props.commands.execute(CommandIDs.dashboardScrollToCell, {
      from: 'Visu',
      source: 'CodeExecComponent',
      cell_id: cellId
    });
  };

  // fetching execution data
  useEffect(() => {
    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${props.notebookId}/user_code_execution?${generateQueryArgsString(dashboardQueryArgsRedux, props.notebookId)}`
    )
      .then(response => response.json())
      .then(data => {
        const chartData: ChartData<'bar'> = {
          labels: Array.from(
            { length: codeCells.length },
            (_, index) => index + 1
          ),
          datasets: [
            {
              label: 'clicks',
              data: Array(codeCells.length).fill(null),
              backgroundColor: 'rgba(51, 187, 238, 0.3)',
              borderColor: 'rgba(51, 187, 238, 0.3)',
              borderWidth: 1,
              hoverBackgroundColor: 'rgba(51, 187, 238, 0.8)',
              hoverBorderColor: 'rgba(51, 187, 238, 0.8)',
              hoverBorderWidth: 1,
              hidden: true // hide the clicks dataset by default
            },
            {
              label: 'executions',
              data: Array(codeCells.length).fill(null),
              backgroundColor: 'rgba(0, 119, 187, 0.6)',
              borderColor: 'rgba(0, 119, 187, 0.6)',
              borderWidth: 1,
              hoverBackgroundColor: 'rgba(0, 119, 187, 0.9)',
              hoverBorderColor: 'rgba(0, 119, 187, 0.9)',
              hoverBorderWidth: 1
            },
            {
              label: 'executions without errors',
              data: Array(codeCells.length).fill(null),
              backgroundColor: 'rgba(0, 153, 136, 0.9)',
              borderColor: 'rgba(0, 153, 136, 0.9)',
              borderWidth: 1,
              hoverBackgroundColor: 'rgba(0, 100, 90, 1)',
              hoverBorderColor: 'rgba(0, 100, 90, 1)',
              hoverBorderWidth: 1
            }
          ]
        };

        // iterate through codeCells and find corresponding datasets from data
        codeCells.forEach((codeCell, index) => {
          const matchingData = data.find(
            (item: any) => item.cell === codeCell.id
          );
          if (matchingData) {
            chartData.datasets[0].data[index] = parseFloat(
              matchingData.cell_click_pct
            );
            chartData.datasets[1].data[index] = parseFloat(
              matchingData.code_exec_pct
            );
            chartData.datasets[2].data[index] = parseFloat(
              matchingData.code_exec_ok_pct
            );
          }
        });
        setCodeExecData(chartData);
      });
  }, [dashboardQueryArgsRedux, refreshRequired]);

  const codeExecOptions = getCodeExecOptions(codeCells, handleCellClick);

  return (
    <ChartContainer
      PassedComponent={<Bar data={codeExecData} options={codeExecOptions} />}
      title="Code cell executions across users"
    />
  );
};

const getCodeExecOptions = (
  codeCells: NotebookCell[] | null,
  onClickCell: (cellId: string) => void
): ChartOptions<'bar'> => ({
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      ...baseChartOptions.plugins?.legend,
      position: 'top'
    },
    tooltip: {
      callbacks: {
        title: (tooltipItem: any) => `Code cell ${tooltipItem[0].label}`
      }
    }
  },
  scales: {
    x: {
      ...baseChartOptions.scales?.x,
      title: {
        ...baseChartOptions.scales?.x?.title,
        text: 'Code cell'
      }
    },
    y: {
      ...baseChartOptions.scales?.y,
      title: {
        ...baseChartOptions.scales?.y?.title,
        text: 'Cumulated total across all users'
      }
    }
  },
  onClick: (_event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const cellId = codeCells?.[index]?.id;
      if (cellId) {
        onClickCell(cellId);
      }
    }
  }
});

export default CodeExecComponent;

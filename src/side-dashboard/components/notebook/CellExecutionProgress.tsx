import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ArrowsFullscreen, CheckLg, XLg } from 'react-bootstrap-icons';
import { RootState } from '../../../redux/store';
import { NotebookCell } from '../../../redux/types';
import { fetchWithCredentials } from '../../../utils/utils';
import { BACKEND_API_URL } from '../../..';
import { CommandIDs } from '../../../utils/constants';
import { InteractionRecorder } from '../../../utils/interactionRecorder';
import { baseChartOptions } from '../../../utils/chartOptions';
import { CommandRegistry } from '@lumino/commands';

ChartJS.register(zoomPlugin);

const TIME_WINDOW_MINUTES = 120;

const parseTimeStart = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const formatMinutesAsTime = (
  minutesFromStart: number,
  startDate: Date
): string => {
  const ms = startDate.getTime() + minutesFromStart * 60000;
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Inline Chart.js plugin for the current-time vertical line.
// Options are read from chart.options.plugins.cellProgressVerticalLine.
const verticalLinePlugin = {
  id: 'cellProgressVerticalLine',
  afterDraw(
    chart: ChartJS,
    _args: unknown,
    options: { xValue: number | null }
  ) {
    const xVal = options?.xValue;
    if (xVal === null || xVal === undefined) {
      return;
    }
    const xScale = chart.scales['x'];
    if (!xScale) {
      return;
    }
    const xPixel = xScale.getPixelForValue(xVal);
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPixel, top);
    ctx.lineTo(xPixel, bottom);
    ctx.strokeStyle = 'rgba(255, 99, 132, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }
};

const CellExecutionProgress = ({
  notebookId,
  commands
}: {
  notebookId: string;
  commands: CommandRegistry;
}) => {
  // committed timeStart triggers fetch; pendingTimeStart tracks the input
  const [timeStart, setTimeStart] = useState<string>('10:00');
  const [pendingTimeStart, setPendingTimeStart] = useState<string>('10:00');
  const [nCells, setNCells] = useState<number>(20);
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    datasets: []
  });

  // currentXValue: minutes from timeStart to now, null if outside the window
  const currentXValueRef = useRef<number | null>(null);
  const notebookCellsRef = useRef<typeof notebookCells | null>(null);
  const chartRef = useRef<ChartJS<'line'>>(null);

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );
  const notebookCells = useSelector(
    (state: RootState) => state.commondashboard.notebookCells
  );

  useEffect(() => {
    notebookCellsRef.current = notebookCells;
  }, [notebookCells]);

  useEffect(() => {
    const timeStartDate = parseTimeStart(timeStart);
    const timeEndDate = new Date(
      timeStartDate.getTime() + TIME_WINDOW_MINUTES * 60000
    );

    // Compute where "now" sits on the x-axis (in minutes from timeStart)
    const nowMinutes = (new Date().getTime() - timeStartDate.getTime()) / 60000;
    currentXValueRef.current =
      nowMinutes >= 0 && nowMinutes <= TIME_WINDOW_MINUTES ? nowMinutes : null;

    const N_CELLS = notebookCells?.length ?? 20;
    setNCells(N_CELLS);

    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${notebookId}/cell_execution_progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_start: timeStartDate.toISOString(),
          time_end: timeEndDate.toISOString(),
          cell_order: notebookCells?.map(c => c.id) ?? [],
          selected_groups:
            dashboardQueryArgsRedux.selectedGroups[notebookId] ?? []
        })
      }
    )
      .then(res => res.json())
      .then(
        (data: {
          timestamps: string[];
          mean: number[];
          median: number[];
          q1: number[];
          q3: number[];
        }) => {
          const timestamps: string[] = data.timestamps ?? [];
          const mean: number[] = data.mean ?? [];
          const median: number[] = data.median ?? [];
          const q1: number[] = data.q1 ?? [];
          const q3: number[] = data.q3 ?? [];

          const xValues = timestamps.map(
            ts =>
              (new Date(ts + 'Z').getTime() - timeStartDate.getTime()) / 60000
          );

          // only include points up to current time (real-time appearance)
          const maxX = currentXValueRef.current ?? TIME_WINDOW_MINUTES;
          const toPoints = (values: number[]) =>
            xValues
              .map((x, i) => ({ x, y: values[i] }))
              .filter(p => p.x <= maxX);

          setChartData({
            datasets: [
              {
                label: 'Mean',
                data: toPoints(mean),
                borderColor: 'rgba(254, 176, 32, 1)',
                backgroundColor: 'transparent',
                fill: false as any,
                pointRadius: 2,
                borderWidth: 2,
                tension: 0.3
              },
              {
                label: 'Median',
                data: toPoints(median),
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'transparent',
                fill: false as any,
                pointRadius: 2,
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3
              },
              {
                label: 'IQR (Q1–Q3)',
                data: toPoints(q3),
                borderColor: 'transparent',
                backgroundColor: 'rgba(54, 162, 235, 0.15)',
                fill: 3,
                pointRadius: 0,
                tension: 0.3
              },
              {
                label: '_q1_hidden',
                data: toPoints(q1),
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                fill: false as any,
                pointRadius: 0,
                tension: 0.3
              }
            ]
          });
        }
      )
      .catch(() => {});
  }, [timeStart, dashboardQueryArgsRedux, refreshRequired]);

  const handleResetZoom = () => {
    chartRef.current?.resetZoom();
    InteractionRecorder.sendInteraction({
      click_type: 'ON',
      signal_origin: 'PROGRESS_VISU_RESET_ZOOM'
    });
  };

  const isPending = pendingTimeStart !== timeStart;

  const chartOptions = getCellProgressOptions(
    timeStart,
    currentXValueRef,
    nCells,
    notebookCellsRef,
    commands
  );

  return (
    <Row className="mb-4">
      <Card className="chart-card">
        <Card.Title className="chart-card-title">
          <span>Cell execution progress over time</span>
        </Card.Title>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem 0.5rem',
            width: '100%'
          }}
        >
          <input
            type="time"
            value={pendingTimeStart}
            onChange={e => setPendingTimeStart(e.target.value)}
            style={{
              fontSize: '13px',
              borderWidth: '1px',
              padding: '2px 6px'
            }}
          />
          {isPending && (
            <>
              <CheckLg
                onClick={() => {
                  setTimeStart(pendingTimeStart);
                  InteractionRecorder.sendInteraction({
                    click_type: 'ON',
                    signal_origin: 'PROGRESS_VISU_TIME_CHANGE'
                  });
                }}
                title="Confirm"
                style={{
                  marginLeft: '6px',
                  cursor: 'pointer',
                  color: 'green',
                  fontSize: '1.5em'
                }}
              />
              <XLg
                onClick={() => setPendingTimeStart(timeStart)}
                title="Cancel"
                style={{
                  marginLeft: '4px',
                  cursor: 'pointer',
                  color: 'red',
                  fontSize: '1.3em'
                }}
              />
            </>
          )}
          <button
            onClick={handleResetZoom}
            style={{
              marginLeft: 'auto',
              fontSize: '13px',
              borderWidth: '1px',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Reset zoom
            <ArrowsFullscreen />
          </button>
        </div>
        <Card.Body className="chart-card-body">
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
            plugins={[verticalLinePlugin as any]}
          />
        </Card.Body>
      </Card>
    </Row>
  );
};

const getCellProgressOptions = (
  timeStart: string,
  currentXValueRef: React.RefObject<number | null>,
  nCells: number,
  notebookCellsRef: React.RefObject<NotebookCell[] | null>,
  commands: CommandRegistry
): ChartOptions<'line'> => {
  const startDate = parseTimeStart(timeStart);
  return {
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      legend: {
        ...baseChartOptions.plugins?.legend,
        display: true,
        labels: {
          ...baseChartOptions.plugins?.legend?.labels,
          usePointStyle: true,
          filter: (item: any) => !item.text.startsWith('_')
        }
      },
      tooltip: {
        ...baseChartOptions.plugins?.tooltip,
        callbacks: {
          title: (items: any[]) => {
            if (!items.length) {
              return '';
            }
            return formatMinutesAsTime(items[0].parsed.x as number, startDate);
          },
          label: (item: any) => {
            if (item.dataset.label?.startsWith('_')) {
              return null as any;
            }
            if (item.dataset.label === 'IQR (Q1–Q3)') {
              return `IQR upper (Q3): cell ${item.parsed.y.toFixed(1)}`;
            }
            return `${item.dataset.label}: cell ${item.parsed.y.toFixed(1)}`;
          }
        }
      },
      zoom: {
        zoom: {
          drag: { enabled: true },
          wheel: { enabled: false },
          pinch: { enabled: false },
          mode: 'x',
          onZoomComplete: () => {
            InteractionRecorder.sendInteraction({
              click_type: 'ON',
              signal_origin: 'PROGRESS_VISU_ZOOM'
            });
          }
        },
        limits: {
          x: { min: 0, max: TIME_WINDOW_MINUTES, minRange: 5 }
        }
      },
      // options consumed by verticalLinePlugin
      cellProgressVerticalLine: {
        xValue: currentXValueRef.current
      } as any
    },
    onClick: (event, _elements, chart) => {
      const native = event.native as MouseEvent;
      if (!native || native.offsetX > chart.chartArea.left) {
        return;
      }
      const cellPosition = Math.round(
        chart.scales['y'].getValueForPixel(native.offsetY) ?? 0
      );
      const cellId = notebookCellsRef.current?.[cellPosition - 1]?.id;
      if (cellId) {
        commands.execute(CommandIDs.dashboardScrollToCell, {
          from: 'Visu',
          source: 'CellExecutionProgress',
          cell_id: cellId
        });
      }
    },
    onHover: (event, _elements, chart) => {
      const native = event.native as MouseEvent;
      if (!native) {
        return;
      }
      chart.canvas.style.cursor =
        native.offsetX <= chart.chartArea.left ? 'pointer' : 'default';
    },
    scales: {
      x: {
        ...baseChartOptions.scales?.x,
        type: 'linear' as const,
        min: 0,
        max: TIME_WINDOW_MINUTES,
        ticks: {
          ...baseChartOptions.scales?.x?.ticks,
          stepSize: 15,
          callback: (value: string | number) =>
            typeof value === 'number'
              ? formatMinutesAsTime(value, startDate)
              : value
        },
        title: {
          ...baseChartOptions.scales?.x?.title,
          text: 'Time'
        }
      },
      y: {
        ...baseChartOptions.scales?.y,
        beginAtZero: false,
        min: 1,
        max: nCells,
        ticks: {
          ...baseChartOptions.scales?.y?.ticks,
          precision: 0,
          stepSize: 1
        },
        title: {
          ...baseChartOptions.scales?.y?.title,
          text: 'Cell position'
        }
      }
    }
  };
};

export default CellExecutionProgress;

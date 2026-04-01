import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// Inline Chart.js plugin for a short thick tick on the y-axis at the active cell.
// Options are read from chart.options.plugins.cellProgressActiveTick.
const activeCellTickPlugin = {
  id: 'cellProgressActiveTick',
  afterDraw(
    chart: ChartJS,
    _args: unknown,
    options: { yValue: number | null }
  ) {
    const yVal = options?.yValue;
    if (yVal === null || yVal === undefined) {
      return;
    }
    const yScale = chart.scales['y'];
    if (!yScale) {
      return;
    }
    const yPixel = yScale.getPixelForValue(yVal);
    const x = chart.chartArea.left;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 8, yPixel);
    ctx.lineTo(x + 4, yPixel);
    ctx.stroke();
    ctx.restore();
  }
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
    datasets: [
      {
        label: 'Mean',
        data: [],
        borderColor: 'rgba(254, 176, 32, 1)',
        backgroundColor: 'transparent'
      },
      {
        label: 'Median',
        data: [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'transparent'
      },
      {
        label: 'IQR (Q1–Q3)',
        data: [],
        borderColor: 'transparent',
        backgroundColor: 'rgba(54, 162, 235, 0.15)'
      },
      {
        label: '_q1_hidden',
        data: [],
        borderColor: 'transparent',
        backgroundColor: 'transparent'
      }
    ]
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
  const activeCellId = useSelector(
    (state: RootState) => state.commondashboard.activeCellId
  );

  const activeCellPositionRef = useRef<number | null>(null);
  const activeCellPosition = useMemo(() => {
    if (!activeCellId || !notebookCells) {
      return null;
    }
    const idx = notebookCells.findIndex(c => c.id === activeCellId);
    return idx >= 0 ? idx + 1 : null;
  }, [activeCellId, notebookCells]);
  activeCellPositionRef.current = activeCellPosition;

  useEffect(() => {
    if (chartRef.current) {
      (chartRef.current.options.plugins as any).cellProgressActiveTick.yValue =
        activeCellPosition;
      chartRef.current.update('none');
    }
  }, [activeCellPosition]);

  useEffect(() => {
    notebookCellsRef.current = notebookCells;
  }, [notebookCells]);

  useEffect(() => {
    chartRef.current?.resetZoom();
  }, [timeStart]);

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
          n_users: number[];
        }) => {
          const timestamps: string[] = data.timestamps ?? [];
          const mean: number[] = data.mean ?? [];
          const median: number[] = data.median ?? [];
          const q1: number[] = data.q1 ?? [];
          const q3: number[] = data.q3 ?? [];
          const nUsers: number[] = data.n_users ?? [];

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

          // mean points carry nUsers for tooltip
          const meanPoints = xValues
            .map((x, i) => ({ x, y: mean[i], nUsers: nUsers[i] ?? 0 }))
            .filter(p => p.x <= maxX);

          // extend the last known value to "now" so a dot always sits on the vertical line
          const extendToNow = <T extends { x: number; y: number }>(
            pts: T[]
          ): T[] => {
            if (!pts.length || currentXValueRef.current === null) {
              return pts;
            }
            const last = pts[pts.length - 1];
            if (last.x >= currentXValueRef.current) {
              return pts;
            }
            return [...pts, { ...last, x: currentXValueRef.current }];
          };

          const newDatasets = [
            {
              label: 'Mean',
              data: extendToNow(meanPoints),
              borderColor: 'rgba(254, 176, 32, 1)',
              backgroundColor: 'transparent',
              fill: false as any,
              pointRadius: 2,
              borderWidth: 2,
              tension: 0.3
            },
            {
              label: 'Median',
              data: extendToNow(toPoints(median)),
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
              data: extendToNow(toPoints(q3)),
              borderColor: 'transparent',
              backgroundColor: 'rgba(54, 162, 235, 0.15)',
              fill: 3,
              pointRadius: 0,
              tension: 0.3
            },
            {
              label: '_q1_hidden',
              data: extendToNow(toPoints(q1)),
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              fill: false as any,
              pointRadius: 0,
              tension: 0.3
            }
          ];

          setChartData({ datasets: newDatasets });
          if (chartRef.current) {
            (
              chartRef.current.options.plugins as any
            ).cellProgressVerticalLine.xValue = currentXValueRef.current;
          }
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

  const chartOptions = useMemo(
    () =>
      getCellProgressOptions(
        timeStart,
        currentXValueRef,
        nCells,
        notebookCellsRef,
        commands,
        activeCellPositionRef
      ),
    [timeStart, nCells]
  );

  return (
    <Row className="mb-4">
      <Card className="chart-card">
        <style>{`
          .cell-progress-btn {
            font-size: 13px;
            border: 1px solid #ced4da;
            padding: 2px 6px;
            cursor: pointer;
            background-color: #f8f9fa;
            border-radius: 3px;
            transition: background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
          }
          .cell-progress-btn:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          }
          .cell-progress-btn:active {
            background-color: #d3d9df;
            border-color: #868e96;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
            transform: translateY(1px);
          }
        `}</style>
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
              border: '1px solid #ced4da',
              padding: '2px 6px'
            }}
          />
          <button
            className="cell-progress-btn"
            onClick={() => {
              const now = new Date();
              const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              setPendingTimeStart(nowStr);
            }}
            title="Set to current time"
            style={{ marginLeft: '4px' }}
          >
            Now
          </button>
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
            className="cell-progress-btn"
            onClick={handleResetZoom}
            style={{
              marginLeft: 'auto',
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
            plugins={[activeCellTickPlugin as any, verticalLinePlugin as any]}
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
  commands: CommandRegistry,
  activeCellPositionRef: React.RefObject<number | null>
): ChartOptions<'line'> => {
  const startDate = parseTimeStart(timeStart);
  return {
    ...baseChartOptions,
    animation: false,
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
            const time = formatMinutesAsTime(
              items[0].parsed.x as number,
              startDate
            );
            const meanItem = items.find((i: any) => i.datasetIndex === 0);
            const n: number | undefined = (meanItem?.raw as any)?.nUsers;
            return n !== undefined ? `${time}  (n=${n})` : time;
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
          drag: {
            enabled: true,
            backgroundColor: 'rgba(100, 149, 237, 0.25)',
            borderColor: 'rgba(100, 149, 237, 0.8)',
            borderWidth: 1
          },
          wheel: { enabled: false },
          pinch: { enabled: false },
          mode: 'xy',
          onZoomComplete: () => {
            InteractionRecorder.sendInteraction({
              click_type: 'ON',
              signal_origin: 'PROGRESS_VISU_ZOOM'
            });
          }
        },
        limits: {
          x: { min: 0, max: TIME_WINDOW_MINUTES, minRange: 5 },
          y: { min: 1, max: nCells, minRange: 2 }
        }
      },
      // options consumed by verticalLinePlugin
      cellProgressVerticalLine: {
        xValue: currentXValueRef.current
      } as any,
      // options consumed by activeCellMarkerPlugin
      cellProgressActiveTick: {
        yValue: activeCellPositionRef.current
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
          stepSize: 1,
          color: (ctx: any) =>
            ctx.tick?.value === activeCellPositionRef.current
              ? 'black'
              : '#969696',
          font: (ctx: any) =>
            ctx.tick?.value === activeCellPositionRef.current
              ? { weight: 'bold' as const }
              : {}
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

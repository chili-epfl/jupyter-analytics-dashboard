import { ChartData, ChartOptions } from 'chart.js';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { BACKEND_API_URL } from '../../..';
import { RootState } from '../../../redux/store';
import { baseChartOptions } from '../../../utils/chartOptions';
import { fetchWithCredentials, generateQueryArgsString } from '../../../utils/utils';
import DashboardSummaryCards from '../common/DashboardSummaryCards';
import SectionHeader from '../common/SectionHeader';
import ChartContainer from './ChartContainer';

interface DetailedAction {
  user_id: string;
  action: string;
  timestamp: string;
}

interface UpdateStat {
  update_id: string;
  timestamp: string;
  update_now: number;
  update_later: number;
  cell_id?: string;
  detailed_actions?: DetailedAction[];
}

// Time bin definitions for aggregation
const TIME_BINS = [
  { label: '0-30s', min: 0, max: 30, color: 'rgba(76, 175, 80, 0.8)' },
  { label: '30s-1m', min: 30, max: 60, color: 'rgba(139, 195, 74, 0.8)' },
  { label: '1-2m', min: 60, max: 120, color: 'rgba(255, 235, 59, 0.8)' },
  { label: '2-5m', min: 120, max: 300, color: 'rgba(255, 152, 0, 0.8)' },
  { label: '5-15m', min: 300, max: 900, color: 'rgba(255, 87, 34, 0.8)' },
  { label: '15m+', min: 900, max: Infinity, color: 'rgba(244, 67, 54, 0.8)' }
];

// Action type color mapping
const ACTION_COLORS = {
  apply_single: {
    background: 'rgba(76, 175, 80, 0.6)',
    border: 'rgba(76, 175, 80, 1)',
    label: 'Applied Update'
  },
  remove_single: {
    background: 'rgba(244, 67, 54, 0.6)',
    border: 'rgba(244, 67, 54, 1)',
    label: 'Deleted Update'
  },
  update_all: {
    background: 'rgba(33, 150, 243, 0.6)',
    border: 'rgba(33, 150, 243, 1)',
    label: 'Applied All Updates'
  },
  delete_all: {
    background: 'rgba(255, 87, 34, 0.6)',
    border: 'rgba(255, 87, 34, 1)',
    label: 'Deleted All Updates'
  }
};

type ActionType = keyof typeof ACTION_COLORS;
type VisualizationType = 'scatter' | 'histogram' | 'summary';

const PendingUpdatesChart = (props: { notebookId: string }) => {
  const [stats, setStats] = useState<UpdateStat[]>([]);
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [showDetailed, setShowDetailed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Detailed visualization filters
  const [selectedActions, setSelectedActions] = useState<Set<ActionType>>(
    new Set(Object.keys(ACTION_COLORS) as ActionType[])
  );
  const [timeRangeMinutes, setTimeRangeMinutes] = useState<number | null>(null);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('histogram'); // Default to histogram for better scalability

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetchWithCredentials(
          `${BACKEND_API_URL}/dashboard/${props.notebookId}/pending_updates_stats?${generateQueryArgsString(
            dashboardQueryArgsRedux,
            props.notebookId
          )}`
        );
        const data: UpdateStat[] = await response.json();
        console.log('Fetched pending updates stats:', data);
        setStats(data);
        
        // Auto-select most recent update
        if (data.length > 0 && !selectedUpdateId) {
          setSelectedUpdateId(data[0].update_id);
        }
      } catch (error) {
        console.error('Failed to fetch pending updates stats', error);
        setStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [props.notebookId, dashboardQueryArgsRedux, refreshRequired]);

  // Get selected update
  const selectedUpdate = useMemo(() => 
    stats.find(s => s.update_id === selectedUpdateId),
    [stats, selectedUpdateId]
  );

  // Calculate aggregated time bins for response times
  const calculateTimeBins = (update: UpdateStat | undefined) => {
    if (!update || !update.detailed_actions || update.detailed_actions.length === 0) {
      return TIME_BINS.map(bin => ({ ...bin, count: 0 }));
    }

    const pushTime = new Date(update.timestamp).getTime();
    const bins = TIME_BINS.map(bin => ({ ...bin, count: 0 }));

    update.detailed_actions.forEach(action => {
      const actionTime = new Date(action.timestamp).getTime();
      const responseTime = (actionTime - pushTime) / 1000; // seconds

      const binIndex = bins.findIndex(
        bin => responseTime >= bin.min && responseTime < bin.max
      );
      if (binIndex !== -1) {
        bins[binIndex].count++;
      }
    });

    return bins;
  };

  // Calculate summary statistics
  const calculateSummaryStats = (update: UpdateStat | undefined) => {
    if (!update) {
      return {
        totalStudents: 0,
        responseRate: 0,
        avgResponseTime: 0,
        medianResponseTime: 0,
        pendingCount: 0
      };
    }

    const totalStudents = update.update_now + update.update_later;
    const actedCount = update.update_now;
    const responseRate = totalStudents > 0 ? Math.round((actedCount / totalStudents) * 100) : 0;
    
    // Calculate response times
    let avgResponseTime = 0;
    let medianResponseTime = 0;
    
    if (update.detailed_actions && update.detailed_actions.length > 0) {
      const pushTime = new Date(update.timestamp).getTime();
      const responseTimes = update.detailed_actions
        .map(action => {
          const actionTime = new Date(action.timestamp).getTime();
          return (actionTime - pushTime) / 1000;
        })
        .sort((a, b) => a - b);
      
      avgResponseTime = Math.round(
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      );
      
      const mid = Math.floor(responseTimes.length / 2);
      medianResponseTime = Math.round(
        responseTimes.length % 2 !== 0
          ? responseTimes[mid]
          : (responseTimes[mid - 1] + responseTimes[mid]) / 2
      );
    }

    return {
      totalStudents,
      responseRate,
      avgResponseTime,
      medianResponseTime,
      pendingCount: update.update_later
    };
  };

  const summaryStats = calculateSummaryStats(selectedUpdate);
  const timeBins = calculateTimeBins(selectedUpdate);

  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Summary cards
  const summaryCards = selectedUpdate ? [
    {
      title: 'Total Recipients',
      value: summaryStats.totalStudents,
      subtitle: 'Students notified',
      icon: '📨',
      color: '#2196F3'
    },
    {
      title: 'Took Action',
      value: `${summaryStats.responseRate}%`,
      subtitle: `${selectedUpdate.update_now} of ${summaryStats.totalStudents} students`,
      icon: '⚡',
      color: summaryStats.responseRate >= 70 ? '#4CAF50' : summaryStats.responseRate >= 40 ? '#FF9800' : '#F44336'
    },
    {
      title: 'Median Response',
      value: summaryStats.medianResponseTime > 0 
        ? formatTime(summaryStats.medianResponseTime)
        : 'N/A',
      subtitle: `Avg: ${formatTime(summaryStats.avgResponseTime)}`,
      icon: '⏱️',
      color: '#00BCD4'
    },
    {
      title: 'Still Pending',
      value: summaryStats.pendingCount,
      subtitle: 'Saved for later',
      icon: '📌',
      color: summaryStats.pendingCount > 0 ? '#FF9800' : '#9E9E9E'
    }
  ] : [];

  // Aggregated response time chart
  const responseTimeChartData: ChartData<'bar'> = {
    labels: timeBins.map(bin => bin.label),
    datasets: [
      {
        label: 'Number of Students',
        data: timeBins.map(bin => bin.count),
        backgroundColor: timeBins.map(bin => bin.color),
        borderColor: timeBins.map(bin => bin.color.replace('0.8', '1')),
        borderWidth: 1
      }
    ]
  };

  const responseTimeChartOptions: ChartOptions<'bar'> = {
    ...baseChartOptions,
    maintainAspectRatio: false,
    plugins: {
      ...baseChartOptions.plugins,
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = summaryStats.totalStudents;
            const count = context.parsed.y;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return `${count} students (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Students',
          color: 'var(--jp-ui-font-color1)'
        },
        ticks: {
          color: 'var(--jp-ui-font-color1)',
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Response Time After Push',
          color: 'var(--jp-ui-font-color1)'
        },
        ticks: {
          color: 'var(--jp-ui-font-color1)'
        }
      }
    }
  };

  // Overview chart showing all updates
  const overviewChartData: ChartData<'bar'> = {
    labels: stats.map((_, idx) => `Update ${idx + 1}`),
    datasets: [
      {
        label: 'Took Action',
        data: stats.map(s => s.update_now),
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1,
        stack: 'response'
      },
      {
        label: 'Saved for Later',
        data: stats.map(s => s.update_later),
        backgroundColor: 'rgba(255, 152, 0, 0.7)',
        borderColor: 'rgba(255, 152, 0, 1)',
        borderWidth: 1,
        stack: 'response'
      }
    ]
  };

  const overviewChartOptions: ChartOptions<'bar'> = {
    ...baseChartOptions,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setSelectedUpdateId(stats[index].update_id);
      }
    },
    plugins: {
      ...baseChartOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const stat = stats[context[0].dataIndex];
            return [
              `Update ${context[0].dataIndex + 1}`,
              `Sent: ${new Date(stat.timestamp).toLocaleString()}`
            ];
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y} students`;
          },
          footer: (context) => {
            const stat = stats[context[0].dataIndex];
            const total = stat.update_now + stat.update_later;
            const rate = total > 0 ? Math.round((stat.update_now / total) * 100) : 0;
            return `Response Rate: ${rate}%`;
          }
        }
      }
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Students',
          color: 'var(--jp-ui-font-color1)'
        },
        ticks: {
          color: 'var(--jp-ui-font-color1)',
          precision: 0
        }
      },
      x: {
        stacked: true,
        ticks: {
          color: 'var(--jp-ui-font-color1)'
        }
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--jp-ui-font-color2)' }}>
        Loading pending updates statistics...
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--jp-ui-font-color2)' }}>
        No pending updates found. Push an update to students to see statistics here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      
      {/* SECTION 1: Update Selection */}
      <SectionHeader 
        icon="📋"
        title="Update Selection"
        subtitle="Choose which update to analyze in detail"
      />
      <div>
        <select
          value={selectedUpdateId || ''}
          onChange={(e) => setSelectedUpdateId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '13px',
            backgroundColor: 'var(--jp-layout-color2)',
            color: 'var(--jp-ui-font-color1)',
            border: '1px solid var(--jp-border-color1)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {stats.map((stat, idx) => {
            const total = stat.update_now + stat.update_later;
            const rate = total > 0 ? Math.round((stat.update_now / total) * 100) : 0;
            const time = new Date(stat.timestamp).toLocaleString();
            return (
              <option key={stat.update_id} value={stat.update_id}>
                Update {idx + 1} - {time} ({rate}% response rate)
              </option>
            );
          })}
        </select>
      </div>

      {/* SECTION 2: Quick Summary */}
      {selectedUpdate && (
        <>
          <SectionHeader 
            icon="📊"
            title="Quick Summary"
            subtitle="Key metrics at a glance"
          />
          <DashboardSummaryCards cards={summaryCards} />
        </>
      )}

      {/* SECTION 3: Response Time Analysis */}
      {selectedUpdate && (
        <>
          <SectionHeader 
            icon="⏱️"
            title="Response Time Analysis"
            subtitle="Student engagement speed breakdown"
          />
          <div style={{ height: '300px' }}>
            <ChartContainer
              PassedComponent={<Bar data={responseTimeChartData} options={responseTimeChartOptions} />}
              title=""
            />
          </div>

          {/* Interpretation Guide */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--jp-layout-color2)',
            border: '1px solid var(--jp-border-color1)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--jp-ui-font-color2)',
            marginTop: '8px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--jp-ui-font-color1)' }}>
              💡 How to Read This Chart
            </div>
            <p style={{ margin: '4px 0' }}>
              This shows how quickly students responded after you pushed the update.
              <strong style={{ color: '#4CAF50' }}> Green bars</strong> = fast response,
              <strong style={{ color: '#4CAF50' }}> Green bars</strong> = fast response,
              <strong style={{ color: '#FF9800' }}> orange/yellow</strong> = moderate,
              <strong style={{ color: '#F44336' }}> red</strong> = slow response.
            </p>
            <p style={{ margin: '4px 0' }}>
              Use median response time (half responded faster, half slower) to identify typical behavior.
            </p>
          </div>
        </>
      )}

      {/* SECTION 4: Detailed Action Timeline */}
      {selectedUpdate && selectedUpdate.detailed_actions && selectedUpdate.detailed_actions.length > 0 && (
        <>
          <SectionHeader 
            icon="🔍"
            title="Detailed Action Timeline"
            subtitle="Individual student actions over time"
          />
          
          {/* Toggle button */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <button
              onClick={() => setShowDetailed(!showDetailed)}
              style={{
                padding: '10px 20px',
                backgroundColor: showDetailed ? 'var(--jp-error-color1)' : 'var(--jp-brand-color1)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {showDetailed ? '🔼 Hide Detailed Timeline' : '🔽 Show Detailed Timeline'}
            </button>
          </div>

          {showDetailed && (
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--jp-layout-color1)',
              border: '1px solid var(--jp-border-color1)',
              borderRadius: '6px'
            }}>
              {/* Visualization type selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--jp-ui-font-color1)'
                }}>
                  Visualization Type:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['scatter', 'histogram', 'summary'] as VisualizationType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setVisualizationType(type)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: visualizationType === type 
                          ? 'var(--jp-brand-color1)' 
                          : 'var(--jp-layout-color2)',
                        color: visualizationType === type 
                          ? 'white' 
                          : 'var(--jp-ui-font-color1)',
                        border: '1px solid var(--jp-border-color1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}
                    >
                      {type === 'scatter' ? '📊 Scatter Plot' : type === 'histogram' ? '📈 Histogram' : '📋 Table'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action filters */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--jp-ui-font-color1)'
                }}>
                  Filter by Action Type:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(Object.keys(ACTION_COLORS) as ActionType[]).map(action => {
                    const isSelected = selectedActions.has(action);
                    return (
                      <button
                        key={action}
                        onClick={() => {
                          const newSet = new Set(selectedActions);
                          if (isSelected) {
                            newSet.delete(action);
                          } else {
                            newSet.add(action);
                          }
                          setSelectedActions(newSet);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: isSelected 
                            ? ACTION_COLORS[action].background 
                            : 'var(--jp-layout-color2)',
                          color: isSelected ? 'white' : 'var(--jp-ui-font-color2)',
                          border: `1px solid ${isSelected ? ACTION_COLORS[action].border : 'var(--jp-border-color1)'}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        {ACTION_COLORS[action].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time range filter */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--jp-ui-font-color1)'
                }}>
                  Filter by Time Range (minutes after push):
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={timeRangeMinutes || ''}
                    onChange={(e) => setTimeRangeMinutes(e.target.value ? Number(e.target.value) : null)}
                    placeholder="All times"
                    min="1"
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      backgroundColor: 'var(--jp-layout-color2)',
                      color: 'var(--jp-ui-font-color1)',
                      border: '1px solid var(--jp-border-color1)',
                      borderRadius: '4px'
                    }}
                  />
                  {timeRangeMinutes && (
                    <button
                      onClick={() => setTimeRangeMinutes(null)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--jp-layout-color2)',
                        color: 'var(--jp-ui-font-color2)',
                        border: '1px solid var(--jp-border-color1)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Render visualization based on type */}
              {(() => {
                // Filter actions based on selections
                const pushTime = new Date(selectedUpdate.timestamp).getTime();
                const filteredActions = (selectedUpdate.detailed_actions || []).filter(action => {
                  const actionType = action.action.toLowerCase() as ActionType;
                  if (!selectedActions.has(actionType)) return false;
                  
                  if (timeRangeMinutes) {
                    const actionTime = new Date(action.timestamp).getTime();
                    const minutesDiff = (actionTime - pushTime) / 1000 / 60;
                    if (minutesDiff > timeRangeMinutes) return false;
                  }
                  
                  return true;
                });

                if (filteredActions.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--jp-ui-font-color3)' }}>
                      No actions  match the current filters
                    </div>
                  );
                }

                // Scatter plot
                if (visualizationType === 'scatter') {
                  // Limit to most recent 200 points for performance with large datasets
                  const MAX_SCATTER_POINTS = 200;
                  const displayActions = filteredActions.length > MAX_SCATTER_POINTS 
                    ? filteredActions.slice(-MAX_SCATTER_POINTS) 
                    : filteredActions;
                  const isLimited = filteredActions.length > MAX_SCATTER_POINTS;
                  
                  const scatterData: ChartData<'scatter'> = {
                    datasets: (Object.keys(ACTION_COLORS) as ActionType[])
                      .filter(action => selectedActions.has(action))
                      .map(action => ({
                        label: ACTION_COLORS[action].label,
                        data: displayActions
                          .filter(a => a.action.toLowerCase() === action)
                          .map((a, idx) => ({
                            x: (new Date(a.timestamp).getTime() - pushTime) / 1000 / 60,
                            y: idx
                          })),
                        backgroundColor: ACTION_COLORS[action].background,
                        borderColor: ACTION_COLORS[action].border,
                        pointRadius: 6,
                        pointHoverRadius: 8
                      }))
                  };

                  const scatterOptions: ChartOptions<'scatter'> = {
                    ...baseChartOptions,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Minutes After Update Push',
                          color: 'var(--jp-ui-font-color1)'
                        },
                        ticks: {
                          color: 'var(--jp-ui-font-color1)'
                        }
                      },
                      y: {
                        display: false
                      }
                    },
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        display: true,
                        position: 'top' as const,
                        labels: {
                          boxWidth: 12,
                          padding: 8,
                          font: { size: 11 }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return `${context.dataset.label} at ${Math.round(context.parsed.x * 10) / 10}min`;
                          }
                        }
                      }
                    }
                  };

                  return (
                    <>
                      {isLimited && (
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: 'var(--jp-warn-color3)',
                          border: '1px solid var(--jp-warn-color1)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: 'var(--jp-ui-font-color1)',
                          marginBottom: '8px'
                        }}>
                          ℹ️ Showing most recent {MAX_SCATTER_POINTS} of {filteredActions.length} actions for better performance. Use histogram for full overview.
                        </div>
                      )}
                      <div style={{ height: '300px' }}>
                        <ChartContainer
                          PassedComponent={<Scatter data={scatterData} options={scatterOptions} />}
                          title=""
                        />
                      </div>
                    </>
                  );
                }

                // Histogram
                if (visualizationType === 'histogram') {
                  const bins = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55 minutes
                  const histogramData: ChartData<'bar'> = {
                    labels: bins.map(b => `${b}-${b + 5}min`),
                    datasets: (Object.keys(ACTION_COLORS) as ActionType[])
                      .filter(action => selectedActions.has(action))
                      .map(action => {
                        const counts = bins.map(binStart => {
                          return filteredActions.filter(a => {
                            if (a.action.toLowerCase() !== action) return false;
                            const mins = (new Date(a.timestamp).getTime() - pushTime) / 1000 / 60;
                            return mins >= binStart && mins < binStart + 5;
                          }).length;
                        });

                        return {
                          label: ACTION_COLORS[action].label,
                          data: counts,
                          backgroundColor: ACTION_COLORS[action].background,
                          borderColor: ACTION_COLORS[action].border,
                          borderWidth: 1
                        };
                      })
                  };

                  const histogramOptions: ChartOptions<'bar'> = {
                    ...baseChartOptions,
                    maintainAspectRatio: false,
                    scales: {
                      x: {
                        stacked: true,
                        title: {
                          display: true,
                          text: 'Time After Push',
                          color: 'var(--jp-ui-font-color1)'
                        },
                        ticks: {
                          color: 'var(--jp-ui-font-color1)'
                        }
                      },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Actions',
                          color: 'var(--jp-ui-font-color1)'
                        },
                        ticks: {
                          color: 'var(--jp-ui-font-color1)',
                          precision: 0
                        }
                      }
                    },
                    plugins: {
                      ...baseChartOptions.plugins,
                      legend: {
                        display: true,
                        position: 'top' as const
                      }
                    }
                  };

                  return (
                    <div style={{ height: '300px' }}>
                      <ChartContainer
                        PassedComponent={<Bar data={histogramData} options={histogramOptions} />}
                        title=""
                      />
                    </div>
                  );
                }

                // Summary table
                const MAX_TABLE_ROWS = 100;
                const tableDisplayActions = filteredActions.length > MAX_TABLE_ROWS 
                  ? filteredActions.slice(-MAX_TABLE_ROWS) 
                  : filteredActions;
                const tableIsLimited = filteredActions.length > MAX_TABLE_ROWS;
                
                return (
                  <>
                    {tableIsLimited && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--jp-warn-color3)',
                        border: '1px solid var(--jp-warn-color1)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: 'var(--jp-ui-font-color1)',
                        marginBottom: '8px'
                      }}>
                        ℹ️ Showing most recent {MAX_TABLE_ROWS} of {filteredActions.length} actions. Use histogram for full overview.
                      </div>
                    )}
                    <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid var(--jp-border-color1)',
                    borderRadius: '4px'
                  }}>
                    <table style={{
                      width: '100%',
                      fontSize: '12px',
                      borderCollapse: 'collapse'
                    }}>
                      <thead style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'var(--jp-layout-color2)',
                        borderBottom: '2px solid var(--jp-border-color2)'
                      }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Time After Push</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableDisplayActions
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map((action, idx) => {
                            const actionType = action.action.toLowerCase() as ActionType;
                            const mins = Math.round((new Date(action.timestamp).getTime() - pushTime) / 1000 / 60 * 10) / 10;
                            
                            return (
                              <tr 
                                key={idx}
                                style={{
                                  backgroundColor: idx % 2 === 0 ? 'var(--jp-layout-color1)' : 'var(--jp-layout-color2)',
                                  borderBottom: '1px solid var(--jp-border-color1)'
                                }}
                              >
                                <td style={{ padding: '10px' }}>
                                  <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: ACTION_COLORS[actionType]?.background || 'gray',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 500
                                  }}>
                                    {ACTION_COLORS[actionType]?.label || action.action}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: 'var(--jp-ui-font-color1)' }}>
                                  {mins} min
                                </td>
                                <td style={{ padding: '10px', color: 'var(--jp-ui-font-color2)', fontSize: '11px' }}>
                                  {new Date(action.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* SECTION 5: All Updates Overview */}
      <SectionHeader 
        icon="📈"
        title="All Updates Overview"
        subtitle={`Comparing ${stats.length} total update${stats.length !== 1 ? 's' : ''} - Click to select`}
      />
      <div style={{ height: `${Math.max(250, stats.length * 35)}px` }}>
        <ChartContainer
          PassedComponent={<Bar data={overviewChartData} options={overviewChartOptions} />}
          title=""
        />
      </div>

      {/* SECTION 5: Global Statistics */}
      <SectionHeader 
        icon="🌍"
        title="Global Statistics"
        subtitle="Aggregate metrics across all updates"
      />
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--jp-layout-color2)',
        border: '1px solid var(--jp-border-color1)',
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ color: 'var(--jp-ui-font-color3)', fontSize: '11px', marginBottom: '4px' }}>
              Total Updates Pushed
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--jp-ui-font-color0)' }}>
              {stats.length}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--jp-ui-font-color3)', fontSize: '11px', marginBottom: '4px' }}>
              Average Response Rate
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--jp-ui-font-color0)' }}>
              {Math.round(stats.reduce((sum, s) => {
                const total = s.update_now + s.update_later;
                return sum + (total > 0 ? (s.update_now / total) * 100 : 0);
              }, 0) / stats.length)}%
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--jp-ui-font-color3)', fontSize: '11px', marginBottom: '4px' }}>
              Total Student Actions
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--jp-ui-font-color0)' }}>
              {stats.reduce((sum, s) => sum + s.update_now + s.update_later, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingUpdatesChart;

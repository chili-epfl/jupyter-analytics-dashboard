import { ChartData, ChartOptions } from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { BACKEND_API_URL } from '../../..';
import { RootState } from '../../../redux/store';
import { baseChartOptions } from '../../../utils/chartOptions';
import { fetchWithCredentials, generateQueryArgsString } from '../../../utils/utils';
import DashboardSummaryCards from '../common/DashboardSummaryCards';
import GroupFilter, { GroupInfo } from '../common/GroupFilter';
import SectionHeader from '../common/SectionHeader';
import ChartContainer from './ChartContainer';

interface CellExecutionData {
  cell: string;
  cell_click_pct: number;
  code_exec_pct: number;
  code_exec_ok_pct: number;
}

const CellExecutionProgressChart = (props: { notebookId: string }) => {
  const [executionData, setExecutionData] = useState<CellExecutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<GroupInfo[]>([]);

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );
  const notebookCells = useSelector(
    (state: RootState) => state.commondashboard.notebookCells
  );

  // Fetch available groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetchWithCredentials(
          `${BACKEND_API_URL}/dashboard/${props.notebookId}/getgroups`
        );
        const groupNames: string[] = await response.json();
        const groups: GroupInfo[] = groupNames.map(name => ({
          name,
          studentCount: 0 // We don't have this data yet, could be enhanced
        }));
        setAvailableGroups(groups);
        // Select all groups by default
        setSelectedGroups(groupNames);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
        setAvailableGroups([]);
      }
    };

    fetchGroups();
  }, [props.notebookId]);

  // Fetch execution data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Apply group filter via standard query mechanism (backend handles it)
        const response = await fetchWithCredentials(
          `${BACKEND_API_URL}/dashboard/${props.notebookId}/user_code_execution?${generateQueryArgsString(
            dashboardQueryArgsRedux,
            props.notebookId
          )}`
        );
        const data: CellExecutionData[] = await response.json();
        setExecutionData(data);
      } catch (error) {
        console.error('Failed to fetch cell execution data:', error);
        setExecutionData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [props.notebookId, dashboardQueryArgsRedux, refreshRequired, selectedGroups]);

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (executionData.length === 0) {
      return {
        totalCells: 0,
        avgExecutionRate: 0,
        avgSuccessRate: 0,
        cellsWithErrors: 0
      };
    }

    const totalCells = executionData.length;
    const avgExecutionRate = executionData.reduce((sum, cell) => sum + cell.code_exec_pct, 0) / totalCells;
    const avgSuccessRate = executionData.reduce((sum, cell) => sum + cell.code_exec_ok_pct, 0) / totalCells;
    
    // Calculate cells where success rate is significantly lower than execution rate (indicating errors)
    const cellsWithErrors = executionData.filter(
      cell => cell.code_exec_pct > 0 && (cell.code_exec_ok_pct / cell.code_exec_pct) < 0.8
    ).length;

    return {
      totalCells,
      avgExecutionRate: Math.round(avgExecutionRate),
      avgSuccessRate: Math.round(avgSuccessRate),
      cellsWithErrors
    };
  };

  const stats = calculateSummaryStats();

  // Prepare chart data
  const codeCells = notebookCells?.filter(cell => cell.cellType === 'code') || [];
  
  const chartData: ChartData<'bar'> = {
    labels: codeCells.map((_, idx) => `Cell ${idx + 1}`),
    datasets: [
      {
        label: 'Executed Successfully',
        data: codeCells.map((cell) => {
          const match = executionData.find(d => d.cell === cell.id);
          return match ? match.code_exec_ok_pct : 0;
        }),
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1,
        stack: 'execution'
      },
      {
        label: 'Executed with Errors',
        data: codeCells.map((cell) => {
          const match = executionData.find(d => d.cell === cell.id);
          if (!match) return 0;
          return match.code_exec_pct - match.code_exec_ok_pct;
        }),
        backgroundColor: 'rgba(255, 152, 0, 0.7)',
        borderColor: 'rgba(255, 152, 0, 1)',
        borderWidth: 1,
        stack: 'execution'
      },
      {
        label: 'Not Executed',
        data: codeCells.map((cell) => {
          const match = executionData.find(d => d.cell === cell.id);
          if (!match) return 100;
          return 100 - match.code_exec_pct;
        }),
        backgroundColor: 'rgba(158, 158, 158, 0.3)',
        borderColor: 'rgba(158, 158, 158, 0.5)',
        borderWidth: 1,
        stack: 'execution'
      }
    ]
  };

  const chartOptions: ChartOptions<'bar'> = {
    ...baseChartOptions,
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      ...baseChartOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = Math.round(context.parsed.x);
            return `${label}: ${value} students`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        max: 100,
        title: {
          display: true,
          text: 'Students (%)',
          color: 'var(--jp-ui-font-color1)'
        },
        ticks: {
          color: 'var(--jp-ui-font-color1)',
          callback: function(value) {
            return value + '%';
          }
        }
      },
      y: {
        stacked: true,
        ticks: {
          color: 'var(--jp-ui-font-color1)',
          font: {
            size: 10
          }
        }
      }
    }
  };

  const summaryCards = [
    {
      title: 'Total Code Cells',
      value: stats.totalCells,
      icon: '📝',
      color: '#2196F3'
    },
    {
      title: 'Avg Execution',
      value: `${stats.avgExecutionRate}%`,
      subtitle: 'Students who ran cells',
      icon: '▶️',
      color: '#4CAF50'
    },
    {
      title: 'Success Rate',
      value: `${stats.avgSuccessRate}%`,
      subtitle: 'Without errors',
      icon: '✅',
      color: '#00BCD4'
    },
    {
      title: 'Cells with Errors',
      value: stats.cellsWithErrors,
      subtitle: 'Need attention',
      icon: '⚠️',
      color: stats.cellsWithErrors > 0 ? '#FF9800' : '#9E9E9E'
    }
  ];

  if (loading) {
    return (
      <div>
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Group Filter */}
      {availableGroups.length > 0 && (
        <GroupFilter
          groups={availableGroups}
          selectedGroups={selectedGroups}
          onGroupsChange={setSelectedGroups}
        />
      )}

      {/* Summary Cards */}
      <DashboardSummaryCards cards={summaryCards} />

      {/* Progress Chart */}
      <div style={{ height: `${Math.max(300, codeCells.length * 30)}px`, marginTop: '16px' }}>
        <ChartContainer
          PassedComponent={<Bar data={chartData} options={chartOptions} />}
          title="Cell Execution Progress"
        />
      </div>

      {/* Interpretation Guide */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--jp-layout-color2)',
        border: '1px solid var(--jp-border-color1)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'var(--jp-ui-font-color2)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--jp-ui-font-color1)' }}>
          📊 How to Read This Chart
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Each bar represents one code cell in the notebook</li>
          <li><span style={{ color: '#4CAF50' }}>Green</span>: Successfully executed without errors</li>
          <li><span style={{ color: '#FF9800' }}>Orange</span>: Executed but had errors</li>
          <li><span style={{ color: '#9E9E9E' }}>Gray</span>: Not yet executed by students</li>
          <li>Width shows percentage of students in each category</li>
        </ul>
      </div>
    </div>
  );
};

export default CellExecutionProgressChart;

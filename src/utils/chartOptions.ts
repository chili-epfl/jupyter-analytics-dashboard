import { ChartOptions } from 'chart.js';

const SIDE_DASHBOARD_BASE_COLOR = '#969696';

export const baseChartOptions: ChartOptions<any> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: SIDE_DASHBOARD_BASE_COLOR
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: SIDE_DASHBOARD_BASE_COLOR
      },
      title: {
        display: true,
        text: '',
        color: SIDE_DASHBOARD_BASE_COLOR
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: SIDE_DASHBOARD_BASE_COLOR
      },
      title: {
        display: true,
        text: '',
        color: SIDE_DASHBOARD_BASE_COLOR
      }
    }
  }
};

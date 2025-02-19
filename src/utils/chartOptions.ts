export const locationOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      labels: {
        color: '#969696'
      }
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Cell (markdown & code)',
        color: '#969696'
      },
      ticks: {
        color: '#969696'
      }
    },
    y: {
      ticks: {
        beginAtZero: true,
        precision: 0,
        color: '#969696'
      },
      title: {
        display: true,
        text: 'Number of users',
        color: '#969696'
      }
    }
  }
};

export const codeExecOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#969696'
      }
    },
    tooltip: {
      callbacks: {
        title: function (tooltipItem: any) {
          return `Code cell ${tooltipItem[0].label}`;
        }
      }
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Code cell',
        color: '#969696'
      },
      ticks: {
        color: '#969696'
      }
    },
    y: {
      // max: 100,
      ticks: {
        beginAtZero: true,
        precision: 0,
        color: '#969696'
      },
      title: {
        display: true,
        text: 'Cumulated total across all users',
        color: '#969696'
      }
    }
  }
};

export const timeSpentOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        usePointStyle: true,
        color: '#969696'
      }
    },
    tooltip: {
      callbacks: {
        title: function (tooltipItem: any) {
          return `Cell ${tooltipItem[0].raw.x}`;
        },
        label: function (tooltipItem: any) {
          return `t: ${tooltipItem.raw.y}`;
        }
      }
    }
  },
  scales: {
    x: {
      type: 'category' as const,
      ticks: {
        color: '#969696'
      },
      title: {
        display: true,
        text: 'Cell (markdown & code)',
        color: '#969696'
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: '#969696'
      },
      title: {
        display: true,
        text: 'Time spent on a cell [s]',
        color: '#969696'
      }
    }
  }
};

export const MAX_DURATION_TIME = 1800; // in seconds, 1800s = 30min
const OVER_MAX_DURATION_STR = `> ${Math.floor(MAX_DURATION_TIME / 60)}'`;

export const cellDurationOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        usePointStyle: true,
        color: '#969696'
      }
    },
    tooltip: {
      usePointStyle: true,
      callbacks: {
        title: function (tooltipItem: any) {
          return `Cell ${tooltipItem[0].raw.x}`;
        },
        label: function (tooltipItem: any) {
          return [
            `${tooltipItem.raw.userCount} of ${tooltipItem.raw.totalCount} users focused on that cell`,
            `Average focus time: ${formatTime(tooltipItem.raw.y)}`
          ];
        }
      }
    }
  },
  scales: {
    x: {
      type: 'category' as const,
      ticks: {
        color: '#969696'
      },
      title: {
        display: true,
        text: 'Cell (markdown & code)',
        color: '#969696'
      }
    },
    y: {
      // max: MAX_DURATION_TIME + Math.floor(0.1 * MAX_DURATION_TIME), // don't display durations > MAX_DURATION_TIME, and add some margin above the y-axis
      // grace: 20, // to add additional padding top and bottom of y-axis
      beginAtZero: true,
      ticks: {
        count: 6,
        precision: 0,
        color: '#969696',
        callback: function (value: string | number, index: number) {
          if (typeof value === 'number') {
            return formatTime(value);
          } else {
            return value;
          }
        }
      },
      title: {
        display: true,
        text: 'Average time spent on the cell',
        color: '#969696'
      }
    }
  }
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secondsLeft = seconds % 60;

  if (seconds >= MAX_DURATION_TIME) {
    return OVER_MAX_DURATION_STR;
  } else {
    return `${minutes > 0 ? minutes + "'" : ''}${secondsLeft.toFixed(0)}"`;
  }
};

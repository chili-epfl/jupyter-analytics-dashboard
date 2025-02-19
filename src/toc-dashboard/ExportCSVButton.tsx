import React, { useState } from 'react';
import { downloadIcon } from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { convertToLocaleString, fetchWithCredentials } from '../utils/utils';
import { BACKEND_API_URL } from '..';

type ValueCallback = (time: Date) => void;

const DialogBodyComponent = (props: {
  startT1: Date;
  startT2: Date;
  t1Callback: ValueCallback;
  t2Callback: ValueCallback;
}) => {
  const [t1, setT1] = useState(props.startT1);
  const [t2, setT2] = useState(props.startT2);

  const currentDateString = convertToLocaleString(new Date());

  const changeT1 = (date: Date) => {
    setT1(date);
    props.t1Callback(date);
  };

  const changeT2 = (date: Date) => {
    setT2(date);
    props.t2Callback(date);
  };

  const handleT1Change = (value: string) => {
    const newDate = new Date(value);
    changeT1(newDate);

    // to ensure t2 stays higher if t1 became larger than t2
    if (newDate >= t2) {
      changeT2(newDate);
    }
  };

  const handleT2Change = (value: string) => {
    const newDate = new Date(value);
    changeT2(newDate);

    // to ensure t1 stays smaller if t2 became lower than t1
    if (newDate <= t1) {
      changeT1(newDate);
    }
  };

  return (
    <div className="dashboard-export-dialog-container">
      <p>
        Select the time range of the data you want to export (the past week
        selected by default).
      </p>
      <div className="dashboard-export-dialog-calendar-container">
        <div className="dashboard-export-dialog-calendar">
          <p>Start Date :</p>
          <input
            className="dashboard-calendar-input"
            type="datetime-local"
            value={convertToLocaleString(t1)}
            onChange={e => handleT1Change(e.target.value)}
            max={convertToLocaleString(t2)}
          />
        </div>
        <div className="dashboard-export-dialog-calendar">
          <p>End Date :</p>
          <input
            className="dashboard-calendar-input"
            type="datetime-local"
            value={convertToLocaleString(t2)}
            onChange={e => handleT2Change(e.target.value)}
            max={currentDateString}
          />
        </div>
      </div>
    </div>
  );
};

const ExportCSVButton = (props: { notebookId: string | null | undefined }) => {
  const [disabledButton, setDisabledButton] = useState(false);

  const exportNotebookDataCSV = (
    notebookId: string | null | undefined,
    t1: Date,
    t2: Date
  ): void => {
    // disable the button before the export request
    setDisabledButton(true);
    let filename = '';
    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${notebookId}/download_csv?t1=${t1.toISOString()}&t2=${t2.toISOString()}`
    )
      .then(response => {
        if (response.ok) {
          const contentDispositionHeader = response.headers.get(
            'Content-Disposition'
          );
          filename =
            contentDispositionHeader?.match(/filename=(.+)/)?.[1] || '';
          return response.blob();
        }
      })
      .then(blob => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      })
      .finally(() => {
        // enable the button after the fetch request is complete
        setDisabledButton(false);
      });
  };

  const showExportDialog = (notebookId: string | null | undefined): void => {
    let t2: Date = new Date();
    let t1: Date = new Date();
    t1.setDate(t2.getDate() - 7); // substracting a week from the current time

    showDialog({
      title: 'Download Notebook Data',
      body: (
        <DialogBodyComponent
          startT1={t1}
          startT2={t2}
          t1Callback={(selectedT1: Date) => (t1 = selectedT1)}
          t2Callback={(selectedT2: Date) => (t2 = selectedT2)}
        />
      ),
      buttons: [
        // Export OK button
        {
          accept: true,
          actions: [],
          ariaLabel: 'Export',
          caption: '',
          className: '',
          displayType: 'default',
          iconClass: '',
          iconLabel: '',
          label: 'Export'
        },
        Dialog.cancelButton()
      ]
    }).then(result => {
      // if the Export button was clicked
      if (result.button.accept) {
        exportNotebookDataCSV(notebookId, t1, t2);
      }
    });
  };

  return (
    <div
      className={
        'dashboard-toc-download-button' + (disabledButton ? '-disabled' : '')
      }
      onClick={() => {
        if (!disabledButton) {
          showExportDialog(props.notebookId);
        }
      }}
    >
      <downloadIcon.react className="dashboard-toc-download-icon" />
      Export
    </div>
  );
};

export default ExportCSVButton;

import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  CommandIDs,
  notebookSelector,
  Selectors,
  APP_ID
} from '../utils/constants';
import React, { useState } from 'react';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import {
  fileUploadIcon,
  linkIcon,
  copyIcon,
  checkIcon
} from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { CompatibilityManager } from '../utils/compatibility';
import { fetchWithCredentials } from '../utils/utils';
import { BACKEND_API_URL } from '..';

const SuccessDialogContent = (props: { url: string; fileName: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    navigator.clipboard
      .writeText(props.url)
      .then(() => {
        setIsCopied(true);
      })
      .catch(error => {
        console.error(`${APP_ID}: Error copying to clipboard: `, error);
      });
  };

  return (
    <div>
      <p>Successfully uploaded, can be downloaded accessing:</p>
      <div className="unianalytics-link-container">
        <div className="unianalytics-link">{props.url}</div>
        <div className="unianalytics-link-button-container">
          <button
            className="unianalytics-link-button"
            onClick={handleCopyClick}
          >
            {isCopied ? <checkIcon.react /> : <copyIcon.react />}
          </button>
        </div>
      </div>
    </div>
  );
};

function uploadNotebook(
  notebookContent: any,
  notebookName: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('notebook_content', JSON.stringify(notebookContent));
    formData.append('name', notebookName);

    const url = BACKEND_API_URL + '/notebook/upload';
    fetchWithCredentials(url, {
      method: 'POST',
      body: formData
    })
      .then(async response => {
        const responseJSON = await response.json();
        if (response.ok) {
          resolve(responseJSON); // resolve the promise with the response data
        } else if (response.status === 422) {
          reject('Invalid token');
        } else {
          reject(responseJSON.error || 'Unknown error');
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

export function activateUploadNotebookPlugin(
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory
) {
  console.log(`JupyterLab extension ${APP_ID}: upload plugin is activated!`);

  app.commands.addCommand(CommandIDs.uploadNotebook, {
    label: 'Upload notebook to unianalytics',
    icon: args => (args['isContextMenu'] ? fileUploadIcon : undefined),
    execute: args => {
      const file = CompatibilityManager.getFileComp(factory);
      if (file) {
        app.serviceManager.contents.get(file.path).then(getResponse => {
          uploadNotebook(getResponse.content, file.name)
            .then(uploadResponse => {
              // shallow copy and changing the content with the upgraded returned notebook
              const contentToSave = {
                ...getResponse,
                content: uploadResponse
              };
              app.serviceManager.contents
                .save(file.path, contentToSave)
                .then(saveResponse => {
                  const notebookId =
                    uploadResponse['metadata'][Selectors.notebookId];
                  const url = `${BACKEND_API_URL}/notebook/download/${notebookId}`;
                  showDialog({
                    title: file.name,
                    body: (
                      <SuccessDialogContent url={url} fileName={file.name} />
                    ),
                    buttons: [Dialog.okButton()]
                  }).catch(e => console.log(e));
                })
                .catch(error => {
                  // handle error while saving
                  showDialog({
                    title: file.name,
                    body: `Error saving the file:\n${error}`,
                    buttons: [Dialog.okButton()]
                  }).catch(e => console.log(e));
                });
            })
            .catch(error => {
              // handle error while uploading
              showDialog({
                title: file.name,
                body: `Error uploading the file:\n${error}`,
                buttons: [Dialog.okButton()]
              }).catch(e => console.log(e));
            });
        });
      }
    }
  });

  app.commands.addCommand(CommandIDs.copyDownloadLink, {
    label: 'Copy unianalytics notebook link',
    icon: args => (args['isContextMenu'] ? linkIcon : undefined),
    execute: args => {
      const file = CompatibilityManager.getFileComp(factory);
      if (file) {
        app.serviceManager.contents.get(file.path).then(getResponse => {
          const notebookMetadata = getResponse.content['metadata'];
          if (notebookMetadata) {
            const notebookId = notebookMetadata[Selectors.notebookId];
            if (notebookId) {
              navigator.clipboard
                .writeText(`${BACKEND_API_URL}/notebook/download/${notebookId}`)
                .catch(error => {
                  console.error(`${APP_ID}: Error copying link: `, error);
                });
            } else {
              console.log(`${APP_ID}: Notebook not tagged`);
            }
          }
        });
      }
    }
  });

  app.contextMenu.addItem({
    selector: notebookSelector,
    type: 'separator',
    rank: 0
  });
  app.contextMenu.addItem({
    args: { isContextMenu: true },
    command: CommandIDs.uploadNotebook,
    selector: notebookSelector,
    rank: 0
  });
  app.contextMenu.addItem({
    args: { isContextMenu: true },
    command: CommandIDs.copyDownloadLink,
    selector: notebookSelector,
    rank: 0
  });
  app.contextMenu.addItem({
    selector: notebookSelector,
    type: 'separator',
    rank: 0
  });
}

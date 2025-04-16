import { JupyterFrontEnd } from "@jupyterlab/application";
import { Dialog, showDialog } from '@jupyterlab/apputils';
import { fileUploadIcon } from "@jupyterlab/ui-components";
import React, { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { BACKEND_API_URL } from "..";
import { APP_ID, CommandIDs } from "../utils/constants";
import { JSONGraph } from "../utils/interfaces";
import { fetchWithCredentials } from "../utils/utils";


function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function uploadNotebook(
  notebookContent: any,
  notebookName: string,
  isSolutionNotebook: boolean = false,
  unianalyticsId: string = ''
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('notebook_content', JSON.stringify(notebookContent));
    formData.append('name', notebookName);

    const url = BACKEND_API_URL + (isSolutionNotebook ? `/notebook/dag/${unianalyticsId}` : '/notebook/upload');
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

const UploadNotebookPopup = (props: {
  app: JupyterFrontEnd,
}) => {

  const [dagEnabled, setDagEnabled] = useState<boolean>(false);
  const [resultingDag, setResultingDag] = useState<JSONGraph>();
  const [notebookFile, setNotebookFile] = useState<File | null>(null);
  const [solutionNotebookFile, setSolutionNotebookFile] = useState<File | null>(null);

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>, isSolution: boolean) {
    if (!e.target.files || e.target.files.length == 0) {
      return;
    }
    if (isSolution) {
      setSolutionNotebookFile(e.target.files[0]);
    } else {
      setNotebookFile(e.target.files[0]);
    }
  }

  async function onSubmit() {
    if (!notebookFile) {
      return;
    }
    const notebookName = notebookFile.name;
    const notebookContent = JSON.parse(await notebookFile.text());

    const unianalyticsId = await uploadNotebook(notebookContent, notebookName)
      .then(uploadResponse => {
        downloadFile(new Blob([JSON.stringify(uploadResponse)], { type: "application/json" }), notebookName)
        return uploadResponse.metadata.unianalytics_notebook_id;
      })
      .catch(error => {
        // handle error while uploading
        showDialog({
          title: notebookName,
          body: `Error uploading the file:\n${error}`,
          buttons: [Dialog.okButton()]
        }).catch(e => console.log(e));
      });
    console.log(unianalyticsId);

    if (!solutionNotebookFile) {
      return;
    }
    const solutionNotebookName = solutionNotebookFile.name;
    const solutionNotebookContent = JSON.parse(await solutionNotebookFile.text());
    uploadNotebook(solutionNotebookContent, solutionNotebookName, true, unianalyticsId)
      .then((uploadResponse: JSONGraph) => {
        console.log(uploadResponse);
        setResultingDag(uploadResponse)
      });
  }

  return (
    <div className="dashboard-unbpopup-content-container">
      <Container fluid>
        <Row className="align-items-center">
          <Col md={4} className="d-flex align-items-center">
            Select a notebook.
          </Col>
          <Col md={8}>
            <Form.Group controlId="notebook-form" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileSelected(e, false)}>
              <Form.Control type="file" />
            </Form.Group>
          </Col>
        </Row>
        <hr></hr>
        <Row>
          <Col md={1}>
            <Form>
              <Form.Check checked={dagEnabled} onChange={(e) => setDagEnabled(e.target.checked)} label="" type="switch">
              </Form.Check>
            </Form>
          </Col>
          <Col onClick={(_) => setDagEnabled(!dagEnabled)}>
            Enable DAG Generation
          </Col>
        </Row>
        {dagEnabled &&
          <Row>
            <Row>
              <Col>
                <span>For DAG generation, please upload the solution notebook as well so that the extension can derive cell dependencies.</span>
              </Col>
            </Row>
            <Row className="align-items-center">
              <Col md={4} className="d-flex align-items-center">
                Select the corresponding solution notebook.
              </Col>
              <Col md={8}>
                <Form.Group controlId="solution-notebook-form" onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileSelected(e, true)}>
                  <Form.Control type="file" />
                </Form.Group>
              </Col>
            </Row>
          </Row>}
        {/* {resultingDag &&
          <Row>
            <ChartContainer PassedComponent={<GraphComponent nxJsonData={resultingDag}></GraphComponent>} title="Notebook DAG" />
          </Row>} */}
        <Row>
          <Button
            variant="primary"
            type="submit"
            onClick={onSubmit}
            disabled={!notebookFile}
            className="dashboard-loginbox-btn">
            Upload
          </Button>
        </Row>
      </Container>
    </div>
  )
}

export function activateUploadNotebookPopup(
  app: JupyterFrontEnd,
) {
  console.log("Adding an upload notebook visualization");

  app.commands.addCommand(CommandIDs.uploadNotebookPopup, {
    label: '[V2] Upload Notebook to unianalytics',
    icon: args => (args['isContextMenu'] ? fileUploadIcon : undefined),
    execute: args => {
      showDialog({
        title: (
          <div className="dashboard-unbpopup-title-container">
            <h4>Upload a notebook to unianalytics</h4>
          </div>
        ),
        body: (
          <UploadNotebookPopup
            app={app} />
        ),
        buttons: [
          {
            accept: false,
            actions: [],
            ariaLabel: 'Close',
            caption: '',
            className: '',
            displayType: 'default',
            iconClass: '',
            iconLabel: '',
            label: 'Close'
          }
        ]
      })
        .then(result => { })
        .catch(e => console.log(`${APP_ID} Error with uploadNotebook: ${e}`))
    }
  })

  // app.contextMenu.addItem({
  //     args: { isContextMenu: true },
  //     command: CommandIDs.uploadNotebookPopup,
  //     selector: notebookSelector,
  //     rank: 0
  // });
}

import React from 'react';
import { Col, Row } from 'react-bootstrap';
import GroupDropDown from '../components/buttons/GroupDropDown';
import TimeDropDown from '../components/buttons/TimeDropDown';
import CellDurationComponent from '../components/notebook/CellDurationComponent';
import CodeExecComponent from '../components/notebook/CodeExecComponent';
import DAGComponent from '../components/notebook/DAGComponent';

interface INotebookPageProps {
  notebookId: string;
  notebookName: string;
}

const Notebook = (props: INotebookPageProps): JSX.Element => {
  return (
    <>
      <div className="dashboard-title-container">
        <div className="dashboard-title-text">{props.notebookName}</div>
        <div className="dashboard-dropdown-container">
          <GroupDropDown notebookId={props.notebookId} />
          <TimeDropDown notebookId={props.notebookId} />
        </div>
      </div>
      <Row>
        <Col>
          <CodeExecComponent notebookId={props.notebookId} />

          <CellDurationComponent notebookId={props.notebookId} />

          <DAGComponent notebookId={props.notebookId} />
        </Col>
      </Row>
    </>
  );
};

export default Notebook;

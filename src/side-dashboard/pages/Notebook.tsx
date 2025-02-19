import React from 'react';
import { Row, Col } from 'react-bootstrap';
import TimeDropDown from '../components/buttons/TimeDropDown';
import CodeExecComponent from '../components/notebook/CodeExecComponent';
import GroupDropDown from '../components/buttons/GroupDropDown';
import CellDurationComponent from '../components/notebook/CellDurationComponent';

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
        </Col>
      </Row>
    </>
  );
};

export default Notebook;

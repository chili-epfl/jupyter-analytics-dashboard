import React from 'react';
import { Col, Card, Row } from 'react-bootstrap';

const ExecutionComponent = (props: {
  value: any;
  index: number;
  ExecutionContent: React.ReactNode;
}) => {
  const processUserId = (): string => {
    if (!props.value.user_id) {
      return `${props.index + 1}`;
    } else if (props.value.user_id.length > 8) {
      return `${props.value.user_id.substring(0, 8)}...`;
    } else {
      return props.value.user_id;
    }
  };

  const displayExecutionTime = (): React.ReactNode | null => {
    if (props.value.t_finish) {
      const dateFromStr = new Date(props.value.t_finish);
      const hours = dateFromStr.getHours().toString().padStart(2, '0');
      const minutes = dateFromStr.getMinutes().toString().padStart(2, '0');
      const day = dateFromStr.getDate().toString().padStart(2, '0');
      const month = (dateFromStr.getMonth() + 1).toString().padStart(2, '0'); // January is 0 in JavaScript Date objects
      const year = dateFromStr.getFullYear().toString().slice(-2); // extract last 2 digits of the year

      const formattedStr = `Executed at ${hours}:${minutes}, ${day}/${month}/${year}`;

      return (
        <Col md={12} className="cell-execution-displayed-time">
          {formattedStr}
        </Col>
      );
    } else {
      return null;
    }
  };

  return (
    <Col md={12}>
      <Card className="cell-card">
        <Card.Body style={{ gap: '10px' }}>
          <Row className="cell-card-wrapper">
            <Col md={12} className="cell-user-title">
              <Card.Text title={props.value.user_id || undefined}>
                User {processUserId()}
              </Card.Text>
            </Col>
            <Col md={12}>{props.ExecutionContent}</Col>

            {displayExecutionTime()}
          </Row>
        </Card.Body>
      </Card>
    </Col>
  );
};

export default ExecutionComponent;

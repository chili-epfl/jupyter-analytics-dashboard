import React, { ReactComponentElement } from 'react';
import { Card, Row } from 'react-bootstrap';
import { Bar, Scatter, Pie, ChartProps } from 'react-chartjs-2';

type PassedComponentType =
  | ReactComponentElement<typeof Bar, ChartProps>
  | ReactComponentElement<typeof Scatter, ChartProps>
  | ReactComponentElement<typeof Pie, ChartProps>;

interface IChartContainerProps {
  PassedComponent: PassedComponentType;
  title: string;
}

const ChartContainer = ({
  PassedComponent,
  title
}: IChartContainerProps): JSX.Element => {
  return (
    <Row className="mb-4">
      <Card className="chart-card">
        <Card.Title className="chart-card-title">{title}</Card.Title>
        <Card.Body className="chart-card-body">{PassedComponent}</Card.Body>
      </Card>
    </Row>
  );
};

export default ChartContainer;

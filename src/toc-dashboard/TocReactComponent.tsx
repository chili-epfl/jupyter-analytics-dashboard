import React from 'react';
import { CommandIDs } from '../utils/constants';
import { CommandRegistry } from '@lumino/commands';

const computeTransparency = (value: number, total: number): number => {
  const transparency: number = (3 * value) / total + 0.1;

  return Math.min(1, transparency);
};

interface ITocComponentProps {
  data: [number | null | undefined, number | null | undefined] | null;
  cellId: string;
  commands: CommandRegistry;
}

const TocReactComponent = ({
  data,
  cellId,
  commands
}: ITocComponentProps): JSX.Element => {
  const handleDashboardClick = (
    event: React.SyntheticEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    commands.execute(CommandIDs.dashboardOpenDashboardPlayback, {
      from: 'Toc',
      cell_id: cellId
    });
  };

  return (
    <>
      {data && data[0] && data[1] ? (
        <div
          onClick={handleDashboardClick}
          className="dashboard-toc-react-component"
          style={{
            backgroundColor: `rgba(25, 118, 210, ${computeTransparency(
              data[0],
              data[1]
            )})`
          }}
        >
          <span className="dashboard-toc-react-text">
            {data[0] + '/' + data[1]}
          </span>
        </div>
      ) : (
        <div className="dashboard-toc-react-component"></div>
      )}
    </>
  );
};

export default TocReactComponent;

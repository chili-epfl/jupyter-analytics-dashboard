import React from 'react';

const ConnectionComponent = (props: {
  connectionId: string;
  onClick: () => void;
}) => {
  return (
    <div className="connectionid-container" onClick={props.onClick}>
      <div className="text-with-ellipsis">{props.connectionId}</div>
      <div
        style={{
          width: '8px',
          height: '8px',
          background: '#2196f3',
          borderRadius: '50%',
          border: '1px solid white'
        }}
      />
    </div>
  );
};

export default ConnectionComponent;

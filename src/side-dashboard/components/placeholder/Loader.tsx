import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loader = (): JSX.Element => {
  return (
    <div style={{ width: '100%', textAlign: 'center', margin: '50px 0' }}>
      <Spinner
        style={{ width: '50px', height: '50px', fontSize: 'x-large' }}
        animation="border"
        role="status"
        variant="primary"
      />
    </div>
  );
};

export default Loader;

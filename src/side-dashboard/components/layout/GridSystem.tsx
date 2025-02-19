import React, { useEffect, useRef, useState } from 'react';
import { Row } from 'react-bootstrap';
import { ResizeObserver } from '@juggle/resize-observer';

const GridSystem = ({
  children
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [numCols, setNumCols] = useState(3);

  // add observer on the ref parent div width as it is independent from the window resize events
  useEffect(() => {
    if (parentRef.current) {
      const ro = new ResizeObserver(entries => {
        const rowWidth = entries[0].contentRect.width;
        if (rowWidth < 576) {
          setNumCols(1);
        } else if (rowWidth < 768) {
          setNumCols(2);
        } else if (rowWidth < 992) {
          setNumCols(3);
        } else if (rowWidth < 1200) {
          setNumCols(4);
        } else if (rowWidth < 1400) {
          setNumCols(5);
        } else {
          setNumCols(6);
        }
      });
      ro.observe(parentRef.current);
      return () => ro.disconnect();
    }
  }, []);

  return (
    <div ref={parentRef}>
      <Row xs={numCols}>{children}</Row>
    </div>
  );
};
export default GridSystem;

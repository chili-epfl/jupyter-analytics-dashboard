import React, { useRef, useEffect } from 'react';
import {
  RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';
import { OutputAreaModel } from '@jupyterlab/outputarea';

// Create a new RenderMimeRegistry instance
const rendermime = new RenderMimeRegistry({
  initialFactories: standardRendererFactories
});

interface ICellOutputProps {
  cell_output_model: any;
}

const CellOutput = ({ cell_output_model }: ICellOutputProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const model: OutputAreaModel = new OutputAreaModel();

  useEffect(() => {
    model.clear();
    model.fromJSON(cell_output_model);

    const container = containerRef.current;
    if (container) {
      // clear the rendered HTML
      container.innerHTML = '';
      for (let i = 0; i < model.length; ++i) {
        const outputUnit = model.get(i);

        const mimeType = rendermime.preferredMimeType(outputUnit.data);

        if (mimeType) {
          // Create a renderer for the MIME type
          const renderer = rendermime.createRenderer(mimeType);

          // Render the data
          renderer.renderModel(outputUnit);

          container.appendChild(renderer.node);
        }
      }
    }
  }, [cell_output_model]);

  return <div ref={containerRef} className="cell-content-container" />;
};

export default CellOutput;

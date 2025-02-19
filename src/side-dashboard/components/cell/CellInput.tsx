import React, { useRef, useEffect } from 'react';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CompatibilityManager } from '../../../utils/compatibility';

interface ICellInputProps {
  cell_input: string;
  language_mimetype: string;
  className: string;
}

const CellInput = ({
  cell_input,
  language_mimetype,
  className
}: ICellInputProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // clear the rendered HTML
      container.innerHTML = '';

      const model = new CodeEditor.Model();
      model.mimeType = language_mimetype;
      model.sharedModel.setSource(cell_input);
      // binds the editor to the host HTML element
      const editor = new CodeMirrorEditor({
        host: container,
        model: model,
        ...CompatibilityManager.getCodeMirrorOptionsComp()
      });

      // in JupyterLab 3 CodeMirror version, editors need to be refreshed once they become visible or they display empty
      const observer = CompatibilityManager.observeEditorVisibility(editor);

      if (observer) {
        observer.observe(container);
      }

      return () => {
        // cleanup: disconnect the observer when the component unmounts
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [cell_input, language_mimetype]);

  return <div ref={containerRef} className={className} />;
};

export default CellInput;

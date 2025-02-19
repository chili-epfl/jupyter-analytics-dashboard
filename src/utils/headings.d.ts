import { Cell } from '@jupyterlab/cells';

interface IHeading {
  text: string;

  level: number;

  onClick: () => void;

  html?: string;
}

interface INumberedHeading extends IHeading {
  numbering?: string | null;
}

interface INotebookHeading extends INumberedHeading {
  type: 'header' | 'markdown' | 'code';

  cellRef: Cell;

  prompt?: string;

  hasChild?: boolean;

  index: number;
}

export { IHeading };
export { INumberedHeading };
export { INotebookHeading };

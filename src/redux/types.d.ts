// definition file for the page content structures and other interfaces

interface NotebookLayer {
  pageName: 'Notebook';
}

interface CellLayer {
  pageName: 'Cell';
  content: {
    cellId: string;
  };
}

// discriminated union type, TypeScript will infer the correct type from pageName value. Will show an error if provided with an unknown pageName.
export type SideDashboardLayer = NotebookLayer | CellLayer;

export interface SideDashboardState {
  navigationState: SideDashboardLayer[];
}

// for ToCReducer
export interface ToCState {
  displayDashboard: boolean;
  hasNotebookId: boolean;
}

export interface NotebookCell {
  id: string;
  cellType: string;
}

export interface IDashboardQueryArgs {
  displayRealTime: {
    [notebookId: string]: boolean; // dictionary where notebookId is the key and boolean is the value
  };
  t1ISOString: {
    [notebookId: string]: string | null;
  };
  t2ISOString: {
    [notebookId: string]: string | null;
  };
  selectedGroups: {
    [notebookId: string]: string[];
  };
  sortBy: {
    [notebookId: string]: string;
  };
}

export interface CommonDashboardState {
  notebookCells: NotebookCell[] | null;
  refreshBoolean: boolean;
  dashboardQueryArgs: IDashboardQueryArgs;
}

import { ISignal } from '@lumino/signaling';
import { INotebookHeading } from './headings';
import { NotebookPanel } from '@jupyterlab/notebook';

export abstract class IOptionsManager { }

export interface ICollapseChangedArgs {
  collapsedState: boolean;

  heading: INotebookHeading;
}

export type ItemRenderer = (
  panel: NotebookPanel,
  item: INotebookHeading,
  headings: INotebookHeading[]
) => JSX.Element | null;

export interface IGenerator {
  options?: IOptionsManager;

  collapseChanged?: ISignal<IOptionsManager, ICollapseChangedArgs>;

  itemRenderer: ItemRenderer;

  toolbarGenerator: (panel: NotebookPanel) => any;

  generate(panel: NotebookPanel): INotebookHeading[];
}

export enum RegistrationState {
  LOADING = 'Loading',
  NOTFOUND = 'Notebook not Registered',
  USERNOTAUTHORIZED = 'No User Permission for this Notebook',
  EXPIREDTOKEN = 'Expired Login Token',
  INVALIDCREDENTIALS = 'Invalid Credentials',
  ERROR = 'Fetching Error',
  SUCCESS = 'Success'
}

export type ValidityChecks = {
  tag: string | null;
  registered: RegistrationState;
};

export type LocationData = {
  location_count: { [key: string]: number };
} | null;

// export enum DashboardClickOrigin {
//   RIGHT_DASHBOARD_SHOW_HIDE = 'RIGHT_DASHBOARD_SHOW_HIDE',
//   TOC_DASHBOARD_SHOW_HIDE = 'TOC_DASHBOARD_SHOW_HIDE',
//   NOTEBOOK_CELL_BUTTON = 'NOTEBOOK_CELL_BUTTON',
//   NOTEBOOK_TOOLBAR_BUTTON = 'NOTEBOOK_TOOLBAR_BUTTON',
//   TOC_OPEN_CELL_DASHBOARD = 'TOC_OPEN_CELL_DASHBOARD',
//   TOC_HEADING_CLICKED = 'TOC_HEADING_CLICKED',
//   TOC_COLLAPSE_HEADERS = 'TOC_COLLAPSE_HEADERS',
//   BREADCRUMB_TO_NOTEBOOK = 'BREADCRUMB_TO_NOTEBOOK',
//   BREADCRUMB_TO_CELL = 'BREADCRUMB_TO_CELL',
//   DASHBOARD_REFRESH_BUTTON = 'DASHBOARD_REFRESH_BUTTON',
//   DASHBOARD_FILTER_TIME = 'DASHBOARD_FILTER_TIME',
//   CELL_DASHBOARD_FILTER_SORT = 'CELL_DASHBOARD_FILTER_SORT',
//   CELL_DASHBOARD_FILTER_CODE_INPUT = 'CELL_DASHBOARD_FILTER_CODE_INPUT',
//   CELL_DASHBOARD_FILTER_CODE_OUTPUT = 'CELL_DASHBOARD_FILTER_CODE_OUTPUT',
//   CELL_DASHBOARD_FILTER_EXECUTION = 'CELL_DASHBOARD_FILTER_EXECUTION',
//   TOC_TOOLBAR_CODE = 'TOC_TOOLBAR_CODE',
//   TOC_TOOLBAR_MARKDOWN = 'TOC_TOOLBAR_MARKDOWN',
//   TOC_TOOLBAR_NUMBERED = 'TOC_TOOLBAR_NUMBERED',
//   TOC_TOOLBAR_SHOW_HIDE = 'TOC_TOOLBAR_SHOW_HIDE',
//   TOC_TOOLBAR_REFRESH = 'TOC_TOOLBAR_REFRESH'
// }

export type InteractionClick = {
  click_type: 'ON' | 'OFF';
  signal_origin: string;
};


export interface JSONGraph {
  directed: boolean;
  multigraph: boolean;
  graph: any;
  nodes: JSONGraphNode[];
  edges: JSONGraphEdge[];
}

export interface JSONGraphNode {
  id: number;
  label: string;
  part: string;
  level: number;
  cell_id?: string[];  // special nodes of parts do not have unianalytics cell ids.
  // properties to be recognized as SimulationNodeDatum in D3
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface JSONGraphEdge {
  source: number | JSONGraphNode;  // node.id
  target: number | JSONGraphNode;  // node.id
  weight?: number;
}


export enum ShowLevel {
  PART = "part",
  CELL = "cell"
}

export interface TocData {
  status: string,
  data: {
    location_count: Map<string, number>
  }
}

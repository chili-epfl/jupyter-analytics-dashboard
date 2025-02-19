import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotebookCell, CommonDashboardState } from '../types';
import { areListsEqual } from '../../utils/utils';

export const initialCommonDashboardState: CommonDashboardState = {
  notebookCells: null,
  refreshBoolean: false,
  dashboardQueryArgs: {
    displayRealTime: {},
    t1ISOString: {},
    t2ISOString: {},
    selectedGroups: {},
    sortBy: {}
  }
};

export const commonDashboardSlice = createSlice({
  name: 'commondashboard',
  initialState: initialCommonDashboardState,
  reducers: {
    setDashboardQueryArgsT1: (
      state,
      action: PayloadAction<{ notebookId: string; t1ISOString: string | null }>
    ) => {
      const { notebookId, t1ISOString } = action.payload;
      state.dashboardQueryArgs.t1ISOString[notebookId] = t1ISOString;
    },
    setDashboardQueryArgsT2: (
      state,
      action: PayloadAction<{ notebookId: string; t2ISOString: string | null }>
    ) => {
      const { notebookId, t2ISOString } = action.payload;
      state.dashboardQueryArgs.t2ISOString[notebookId] = t2ISOString;
    },
    setDashboardQueryArgsSelectedGroups: (
      state,
      action: PayloadAction<{
        notebookId: string;
        groups: string[];
      }>
    ) => {
      const { notebookId, groups } = action.payload;
      const currentGroups =
        state.dashboardQueryArgs.selectedGroups[notebookId] || [];

      // check if the new value is different from the current one
      if (!areListsEqual(currentGroups, groups)) {
        // return immutable-friendly state modification
        return {
          ...state,
          dashboardQueryArgs: {
            ...state.dashboardQueryArgs,
            selectedGroups: {
              ...state.dashboardQueryArgs.selectedGroups,
              [notebookId]: groups
            }
          }
        };
      }
    },
    setDashboardQueryArgsDisplayRealTime: (
      state,
      action: PayloadAction<{ notebookId: string; displayRealTime: boolean }>
    ) => {
      const { notebookId, displayRealTime } = action.payload;
      state.dashboardQueryArgs.displayRealTime[notebookId] = displayRealTime;
    },
    setSortBy: (
      state,
      action: PayloadAction<{ notebookId: string; sortCriterion: string }>
    ) => {
      const { notebookId, sortCriterion } = action.payload;
      state.dashboardQueryArgs.sortBy[notebookId] = sortCriterion;
    },
    setNotebookCells: (state, action: PayloadAction<NotebookCell[] | null>) => {
      state.notebookCells = action.payload;
    },
    refreshDashboards: state => {
      state.refreshBoolean = !state.refreshBoolean;
    }
  }
});

export const {
  setDashboardQueryArgsT1,
  setDashboardQueryArgsT2,
  setDashboardQueryArgsSelectedGroups,
  setDashboardQueryArgsDisplayRealTime,
  setSortBy,
  setNotebookCells,
  refreshDashboards
} = commonDashboardSlice.actions;

export default commonDashboardSlice.reducer;

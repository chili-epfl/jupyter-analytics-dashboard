import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SideDashboardState } from '../types';

export const initialSideDashboardState: SideDashboardState = {
  navigationState: [{ pageName: 'Notebook' }]
};

export const sideDashboardSlice = createSlice({
  name: 'sidedashboard',
  initialState: initialSideDashboardState,
  reducers: {
    navigateToNotebook: (state, action: PayloadAction<void>) => {
      state.navigationState = [
        {
          pageName: 'Notebook'
        }
      ];
    },
    navigateToCell: (
      state,
      action: PayloadAction<{
        cellId: string;
      }>
    ) => {
      state.navigationState = [
        {
          pageName: 'Notebook'
        },
        {
          pageName: 'Cell',
          content: {
            cellId: action.payload.cellId
          }
        }
      ];
    },
    navigateToHistory: (state, action: PayloadAction<number>) => {
      state.navigationState = state.navigationState.slice(
        0,
        action.payload + 1
      );
    },
    resetNavigationState: (state, action: PayloadAction<void>) => {
      state.navigationState = initialSideDashboardState.navigationState;
    }
  }
});

export const {
  navigateToNotebook,
  navigateToCell,
  navigateToHistory,
  resetNavigationState
} = sideDashboardSlice.actions;

export default sideDashboardSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToCState } from '../types';

export const initialToCDashboardState: ToCState = {
  displayDashboard: true,
  hasNotebookId: false
};

export const tocDashboardSlice = createSlice({
  name: 'tocdashboard',
  initialState: initialToCDashboardState,
  reducers: {
    setDisplayHideDashboard: (state, action: PayloadAction<boolean>) => {
      state.displayDashboard = action.payload;
    },
    setHasNotebookId: (state, action: PayloadAction<boolean>) => {
      state.hasNotebookId = action.payload;
    }
  }
});

export const { setDisplayHideDashboard, setHasNotebookId } =
  tocDashboardSlice.actions;

export default tocDashboardSlice.reducer;

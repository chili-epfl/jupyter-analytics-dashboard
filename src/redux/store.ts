import { configureStore } from '@reduxjs/toolkit';
import ToCDashboardReducer from './reducers/ToCDashboardReducer';
import SideDashboardReducer from './reducers/SideDashboardReducer';
import CommonDashboard from './reducers/CommonDashboardReducer';

export const store = configureStore({
  reducer: {
    tocdashboard: ToCDashboardReducer,
    sidedashboard: SideDashboardReducer,
    commondashboard: CommonDashboard
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

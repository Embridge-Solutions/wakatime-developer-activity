import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './slice';
import filterReducer from './slice/filterSlice';
import serverStatusReducer from './slice/serverStatusSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    filters: filterReducer,
    serverStatus: serverStatusReducer,
  },
  middleware: (gDM) =>
    gDM().concat(apiSlice.middleware),
});

// enables refetchOnFocus / refetchOnReconnect for all RTK Query hooks
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
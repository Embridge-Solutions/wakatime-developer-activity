/**
 * filterSlice.ts
 *
 * Dashboard / report filters kept in Redux, so moving between the dashboards
 * and reports keeps the same date range, developer and team for the session.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { format, subDays } from "date-fns";

export type RangePreset = "today" | "7d" | "14d" | "30d" | "thisMonth" | "custom";

export interface ActivityFilterState {
  preset: RangePreset;
  /** "yyyy-MM-dd" — IST activity days */
  fromDate: string;
  toDate: string;
  developerId: number | null;
  /** E2M_Team_M.id */
  teamId: number | null;
}

const today = new Date();

const initialState: { activity: ActivityFilterState } = {
  activity: {
    preset: "7d",
    fromDate: format(subDays(today, 6), "yyyy-MM-dd"),
    toDate: format(today, "yyyy-MM-dd"),
    developerId: null,
    teamId: null,
  },
};

const filterSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setActivityFilter(state, action: PayloadAction<Partial<ActivityFilterState>>) {
      state.activity = { ...state.activity, ...action.payload };
    },
    resetActivityFilter(state) {
      state.activity = initialState.activity;
    },
  },
});

export const { setActivityFilter, resetActivityFilter } = filterSlice.actions;
export default filterSlice.reducer;

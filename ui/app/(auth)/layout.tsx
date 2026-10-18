"use client";

import { store } from "@/redux/store";
import React from "react";
import { Provider } from "react-redux";

// Toasts come from the <Toaster> in the root layout.
const layout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return <Provider store={store}>{children}</Provider>;
};

export default layout;

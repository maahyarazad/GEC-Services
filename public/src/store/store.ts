import { configureStore } from "@reduxjs/toolkit";
import eventReducer from "../features/eventSlice";

export const store = configureStore({
  reducer: {
    events: eventReducer,
  },
});

// 🔹 Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
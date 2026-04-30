import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store/store";

interface Event {
  id: string | number;
  title: string;
}

interface EventState {
  events: Array<Event>;
  shouldRefetch: boolean;
}

const initialState: EventState = {
  events: [],
  shouldRefetch: false,
};

const eventSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setEvents(state, action: PayloadAction<Event[]>) {
      state.events = action.payload;
    },
    addEvent(state, action: PayloadAction<Event>) {
      state.events.push(action.payload);
    },
    removeEvent(state, action: PayloadAction<string | number>) {
      state.events = state.events.filter((event) => event.id !== action.payload);
    },
    updateEvent(state, action: PayloadAction<Event>) {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    clearEvents(state) {
      state.events = [];
    },
    triggerRefetch(state) {
      state.shouldRefetch = true;
    },
    clearRefetch(state) {
      state.shouldRefetch = false;
    },
  },
});

export const {
  setEvents,
  addEvent,
  removeEvent,
  updateEvent,
  clearEvents,
  triggerRefetch,
  clearRefetch,
} = eventSlice.actions;

// Selectors
export const getEvents = (state: RootState) => state.events.events;
export const getEventById = (id: string | number) => (state: RootState) =>
  state.events.events.find((e) => e.id === id);
export const getShouldRefetch = (state: RootState) => state.events.shouldRefetch;

export default eventSlice.reducer;
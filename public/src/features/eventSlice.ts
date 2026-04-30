import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store/store";

interface Event {
  id: string | number;
  title: string;
}

interface GuestRow {
  id: string | number;
  type: string;
  title: string;
  language: string;
  first_name: string;
  last_name: string;
  club_partner_name: string;
  complete_attendance: number;
}

interface EventState {
  events: Array<Event>;
  selectedGuestList: Array<GuestRow>;
  shouldRefetch: boolean;
  shouldRefetchGuestList: boolean;
  selectedEvent: Event | null;
}

const initialState: EventState = {
  events: [],
  selectedGuestList: [],
  shouldRefetch: false,
  shouldRefetchGuestList: false,
  selectedEvent: null,
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
    triggerRefetchGuestList(state) {
      state.shouldRefetchGuestList = true;
    },
    clearRefetch(state) {
      state.shouldRefetch = false;
    },
    clearRefetchGuestList(state) {
      state.shouldRefetchGuestList = false;
    },
    setSelectedEvent(state, action: PayloadAction<Event>) {
      state.selectedEvent = action.payload;
    },
    clearSelectedEvent(state) {
      state.selectedEvent = null;
    },
    setSelectedGuestList(state, action: PayloadAction<GuestRow[]>) {  // 👈 new
      state.selectedGuestList = action.payload;
    },
    clearSelectedGuestList(state) {                                    // 👈 new
      state.selectedGuestList = [];
    },
    updateGuestRow(state, action: PayloadAction<GuestRow>) {           // 👈 new - useful for marking attendance without refetch
      const index = state.selectedGuestList.findIndex((g) => g.id === action.payload.id);
      if (index !== -1) {
        state.selectedGuestList[index] = action.payload;
      }
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
  triggerRefetchGuestList,
  clearRefetch,
  clearRefetchGuestList,
  setSelectedEvent,
  clearSelectedEvent,
  setSelectedGuestList,    // 👈 new
  clearSelectedGuestList,  // 👈 new
  updateGuestRow,          // 👈 new
} = eventSlice.actions;

// Selectors
export const getEvents = (state: RootState) => state.events.events;
export const getEventById = (id: string | number) => (state: RootState) =>
  state.events.events.find((e) => e.id === id);
export const getShouldRefetch = (state: RootState) => state.events.shouldRefetch;
export const getShouldRefetchGuestList = (state: RootState) => state.events.shouldRefetchGuestList;
export const getSelectedEvent = (state: RootState) => state.events.selectedEvent;
export const getSelectedGuestList = (state: RootState) => state.events.selectedGuestList;  // 👈 new

export default eventSlice.reducer;
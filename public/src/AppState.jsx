// src/state/AppState.jsx
import { createContext, useContext } from "react";

import { createAppState } from "./createAppState.jsx";

const AppStateContext = createContext(null);

export const AppStateProvider = ({ children }) => {
  const state = createAppState();
  
  return (
    <AppStateContext.Provider value={state}>
      {children}
    </AppStateContext.Provider>
  );
};

// custom hook for easier access
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
};

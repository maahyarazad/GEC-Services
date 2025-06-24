// ErrorContext.js
import { createContext, useState } from "react";
import PropTypes from "prop-types";

const ErrorContext = createContext();

export const ErrorProvider = ({ children }) => {
  const [errorMessage, setErrorMessage] = useState("");
  const [active, setActive] = useState(false);

  const showError = (message, isActive = false) => {
    setErrorMessage(message);
    setActive(isActive);
    setTimeout(() => {
      setErrorMessage("");
      setActive(false);
    }, 3000);
  };

  return (
    <ErrorContext.Provider value={{ errorMessage, active, showError }}>
      {children}
    </ErrorContext.Provider>
  );
};

// Add prop types validation
ErrorProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { ErrorContext };

// ErrorMessage.js
import { useError } from "../custom_hooks/useError";

const ErrorMessage = () => {
  const { errorMessage, active } = useError();

  return (
    <div className={`error-message ${active ? "active" : ""}`}>
      {errorMessage && <p>{errorMessage}</p>}
    </div>
  );
};

export default ErrorMessage;

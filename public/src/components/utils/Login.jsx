import { useState, useRef } from "react";
import { UseLogin } from "../hooks/UseLogin";
import "./login.css";
import { UseFormValidator } from "../hooks/UseFormValidator";

export const Login = () => {
  const [showPassword, setShowPassowrd] = useState(false);
  const emailRef = useRef();
  const confirmRef = useRef();
  const loginRef = useRef();
  const statusRef = useRef();

  const handleLoginSubmit = async () => {
    const values = document.querySelectorAll(".loginvalue");
    const validate = UseFormValidator(values);

    if (!validate) {
      return;
    }

    const formData = {
      [emailRef.current.name]: emailRef.current.value,
      [confirmRef.current.name]: confirmRef.current.value,
    };
    const loginResponse = await UseLogin(formData);

    if (!loginResponse) {
      statusRef.current.textContent = "An error occurred during login.";
      return;
    }

    if (loginResponse.success) {
      localStorage.setItem(
        "gec-registration",
        JSON.stringify(loginResponse.data)
      );
      statusRef.current.textContent = "Login successful, please wait.... ";
      setTimeout(() => {
        window.location.assign(`/${loginResponse.data.page}`);
      }, 2000);
    } else {
      statusRef.current.textContent = "Access code or username error...";
    }
  };

  return (
    <div className="login">
      <div>
        <h4>Please login to view this page</h4>
        <form ref={loginRef}>
          <label className="full">
            <input
              defaultValue={"book@mailinator.com"}
              ref={emailRef}
              type="email"
              placeholder="Email"
              name="email"
              className="loginvalue"
            ></input>
          </label>
          <label className="full">
            <input
              ref={confirmRef}
              defaultValue={"12345"}
              name="confirm"
              type={showPassword ? "text" : "password"}
              placeholder={showPassword ? "Enter password" : "••••••••"}
              className="loginvalue"
            ></input>
          </label>
          <div className="cta-zone">
            <button
              onClick={(e) => handleLoginSubmit(e)}
              type="button"
              className="cta-button dark"
            >
              <img alt="login" src="/lock.svg"></img>
              <p>Login</p>
            </button>
            <span>
              <p>Show Password</p>
              <input
                onChange={() => setShowPassowrd((prev) => !prev)}
                type="checkbox"
              ></input>
            </span>
          </div>
        </form>
        <p ref={statusRef}></p>
      </div>
    </div>
  );
};

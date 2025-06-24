import "./header.css";
import PropTypes from "prop-types";
import { useState } from "react";
import CHookDateTime from "./CHookDateTime";

export const Header = () => {
  const [burgerActive, setBurgerActive] = useState(false);
  const dateTime = CHookDateTime();

  const handleBurgerMenu = () => {
    setBurgerActive((prev) => !prev);
  };
  return (
    <>
      <header>
        <div>
          <span>
            <button
              onClick={handleBurgerMenu}
              id="burgerMenu"
              className={burgerActive ? "click" : null}
            >
              <span></span>
            </button>
            <a to="/">
              <img alt="GEC Logo" src="/logo-gec.png"></img>
            </a>
          </span>
          <span>
            <p id="setTheTime">{dateTime}</p>
          </span>
        </div>
      </header>
    </>
  );
};

Header.propTypes = {
  xTasks: PropTypes.array.isRequired,
};

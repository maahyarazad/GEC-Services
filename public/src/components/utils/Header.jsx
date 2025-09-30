import "./header.css";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import CHookDateTime from "./CHookDateTime";
import GEC_logo from "../../assets/media/20-Jahre.webp";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { Tooltip } from "@mui/material";
import { useNavigate } from "react-router";
import {config} from '../../ui_config';

export const Header = ({ adminUser, setAdminUser, showMenu, burgerActive,setBurgerActive  }) => {


    const handleBurgerMenu = () => {
        setBurgerActive((prev) => !prev);
        
    
    }

    const dateTime = CHookDateTime();
    const navigate = useNavigate();
    const HandleLogout = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/admin/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });

            if (response.ok) {

                setAdminUser(null);
                navigate("/admin");
            }

        } catch (err) {
            console.error("Logout error:", err);
        }

    }


    return (
        <>
            <header>
                <div>
                    
                    <span>
                    <div className={showMenu ? "" : `d-none`}>

                        <button 
                        onClick={handleBurgerMenu}
                        id="burgerMenu"
                        className={burgerActive ? "click" : null}
                        >
                        <span></span>
                        </button>
                    </div>
                    
                        <a to="/">
                            <img alt="GEC Logo" src={GEC_logo}></img>
                        </a>
                    </span>
                    <div className="d-flex align-items-center">

                        <strong className="pe-2">
                            <p id="setTheTime">{dateTime}</p>
                        </strong>
                        <Tooltip componentsProps={config.tooltip_config}
                        title="Logout">
                            <div onClick={HandleLogout} style={{ cursor: 'pointer' }}>
                                <RiLogoutBoxRLine size={22} />
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </header>
        </>
    );
};

Header.propTypes = {
    xTasks: PropTypes.array.isRequired,
};

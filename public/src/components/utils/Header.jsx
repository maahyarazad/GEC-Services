import "./header.css";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import CHookDateTime from "./CHookDateTime";

import { RiLogoutBoxRLine } from "react-icons/ri";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router";
import { config } from '../../ui_config';

export const Header = ({ adminUser, setAdminUser, showMenu, burgerActive, setBurgerActive }) => {


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
                <div >

                    <span>
                        <div className={showMenu ? "visible" : 'invisible'}>

                            <button
                                onClick={handleBurgerMenu}
                                id="burgerMenu"
                                className={burgerActive ? "click" : null}
                            >
                                <span></span>
                            </button>
                        </div>

                        <div className="d-flex align-items-center">
                            <img alt="GEC Logo" src={`${import.meta.env.VITE_SERVERURL}/uploads/logo@2x.png`} height={50} style={{cursor:'pointer'}} onClick={()=>  console.log('🤖')}/>
                            <div className="d-flex flex-column ps-3" style={{fontWeight: 300 }}>
                                <div>GEC Services</div>
                                <div style={{fontSize: 10}}>Admin Area</div>
                            </div>
                        </div>
                        
                    </span>


                    <div className={`align-items-end d-flex ${showMenu ? "" : ''}`}>

                        <strong className={`pe-2 ${showMenu ? "d-none" : ''}`}>
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

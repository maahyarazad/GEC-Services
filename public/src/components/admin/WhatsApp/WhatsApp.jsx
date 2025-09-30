import "./whatsapp-broadcast.css";
import { useEffect, useRef, useState } from "react";
import templates from '../../../assets/whatsapp-template.json';
import { FaWhatsapp } from "react-icons/fa";
import { Box } from "@mui/material";

export const WhatsappBroadcast = () => {

    const [data, setData] = useState([]);

    useEffect(() => {

        setData(templates);

    }, [])


    const exampleMessageRef = useRef();
    const typeAreaRef = useRef();
    const [list, setList] = useState();
    const handleBroadcastListClick = (e) => {
        const currentactive = document.querySelector(".button-lists > .active");
        currentactive ? currentactive.classList.remove("active") : null;
        e.target.classList.add("active");
        setList(e.target.textContent.replaceAll(" ", "_").toLowerCase());
        
    };

    const handleShowPanel = (e, target, type) => {
        e.preventDefault();
        document.querySelector(`.${type}-input.show`).classList.remove("show");
        document.querySelector(`.${type}-input.${target}`).classList.add("show");
    };

    const handleTemplateListClick = (e, message) => {
        const currentactive = document.querySelector(".template-lists > .active");
        currentactive ? currentactive.classList.remove("active") : null;
        e.target.classList.add("active");
        exampleMessageRef.current.textContent = message;
    };

    const handleTypeTextArea = (e) => {
        const value = e.target.value; // Get the value from the event target
        exampleMessageRef.current.textContent = value; // Update the text content
    };


    if (!templates) {
        return;
    }


    const handleSendWhatsapp = () => {
        console.log("click");
        const checkerror = document.querySelector("span.lists.error");
        if (checkerror) {
            checkerror.classList.remove("error");
        }

        if (!list) {
            document
                .querySelector(".list-container span.lists")
                .classList.add("error");
            return;
        }
        const template = exampleMessageRef.current.textContent;
        const filledTemplate = template.replaceAll("FIRSTNAME", "");
        console.log(filledTemplate);
    };

    return (
        <Box sx={{ padding: 1 }}>
            <div className="d-flex justify-content-center align-items-center" style={{height: '83dvh'}}>

                <h2>Under Development</h2>
            </div>
            <div className="whatsapp-broadcast border-1 d-none">
                <div className="list-container">
                    <h5>Choose recipient/s</h5>
                    <span className="lists receiver-input button-lists show">
                        <button onClick={handleBroadcastListClick}>
                            <p>Business Breakfast</p>
                        </button>
                        <button onClick={handleBroadcastListClick}>
                            <p>Experts Circle</p>
                        </button>
                        <button onClick={handleBroadcastListClick}>
                            <p>Business Breakfast</p>
                        </button>

                    </span>
                    <span className="single receiver-input">
                        <input type="tel" placeholder="+971000000000"></input>
                    </span>
                    <span className="choice-set">
                        <button
                            onClick={(e) => {
                                handleShowPanel(e, "lists", "receiver");
                            }}
                        >
                            List
                        </button>
                        <p>/</p>
                        <button
                            onClick={(e) => {
                                handleShowPanel(e, "single", "receiver");
                            }}
                        >
                            Individual Number
                        </button>
                    </span>
                </div>
                <div className="messaging-container">
                    <h5>What would you like to send? </h5>
                    <span className="lists message-input template-lists show">
                        {data && (
                            data.map((item, index) => {
                                return (
                                    <button
                                        key={item.id || index}
                                        onClick={(e) => handleTemplateListClick(e, item.message)}
                                    >
                                        <p>{item.name}</p>
                                    </button>
                                );
                            })
                        )}
                    </span>
                    <span className="single message-input">
                        <textarea
                            ref={typeAreaRef}
                            onInput={handleTypeTextArea}
                            placeholder="Write your message"
                            rows={5}
                        ></textarea>
                        <p>
                            <strong>Note: </strong>Use <em>FIRSTNAME</em>, <em>LASTNAME</em>,
                            or <em>NAME</em> to personalize your message.
                        </p>
                    </span>
                    <span className="choice-set">
                        <button
                            onClick={(e) => {
                                handleShowPanel(e, "lists", "message");
                            }}
                        >
                            Template Message
                        </button>
                        <p>/</p>
                        <button
                            onClick={(e) => {
                                handleShowPanel(e, "single", "message");
                            }}
                        >
                            Custom Message
                        </button>
                    </span>
                </div>
                <div className="example-container">
                    <h5>What Your Message Will Look Like:</h5>
                    <p ref={exampleMessageRef} id="exampleMessage"></p>
                    <button onClick={handleSendWhatsapp} className="cta-button green">
                        <FaWhatsapp
                            color="white"
                            size={25}
                        // style={{ marginRight: "8px" }}
                        />
                        <p>Send Messages</p>
                    </button>
                </div>
            </div>
        </Box>
    );
};


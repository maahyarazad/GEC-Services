import "./templateform.css";
import { Login } from "../utils/Login";
import { useEffect, useRef, useState } from "react";
import { UseFormValidator } from "../hooks/UseFormValidator";
import { UseCreateRecord } from "../hooks/UseCreateRecord";
import { Link } from "react-router-dom";

export const TemplateForm = () => {

    const [target, setTarget] = useState(null);
    const [showSubmit, setShowSubmit] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const formRegRef = useRef();
    const modalRef = useRef();

    useEffect(() => {
        const gecuser = JSON.parse(localStorage.getItem("gec-registration"));

        if (gecuser) {
            setTarget(gecuser.value);
        }

    }, []);

    if (!target) {
        return <Login />;
    }

    const handleSubmitRegistration = async (e) => {
        e.preventDefault();
        const values = formRegRef.current.querySelectorAll("input, select");
        const validate = UseFormValidator(values);

        if (!validate) {
            return;
        }
        const formData = {};
        formData["eventPage"] = target;

        Array.from(values).forEach((item) => {
            if (item.name) {
                formData[item.name] = item.value;
            }
        });

        // console.log("Form data:", formData);

        const createRecordResponse = await UseCreateRecord(
            formData,
            null,
            null,
            "registration",
            "create"
        );

        if (createRecordResponse.status) {
            setShowModal((prev) => !prev);
            modalRef.current.textContent = createRecordResponse.message;

            Array.from(values).forEach((item) => (item.value = ""));
        }
    };

    return (
        <>
            <div className={`template-form ${target.lockRegistration ? "locked-template-form" : ""}`}>
                <div>
                    <p>
                        {target.description}
                    </p>
                    <img src={target.Image} alt="My Image" />
                </div>
                <div>
                    <Link to={"/"}>
                        <img alt="home" src="/logo-gec.png"></img>
                    </Link>
                    <div>
                        <button
                            onClick={() => {
                                setShowModal((prev) => !prev);
                                modalRef.current.textContent =
                                    "Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus beatae natus cupiditate eaque, qui tempora quisquam voluptatem";
                            }}
                            className="cta-button simple"
                        >
                            <img alt="" src="/info.svg"></img>
                        </button>
                        <form ref={formRegRef}>
                            <h1>Please fill in the boxes below</h1>
                            <h4>17 June 2025 - Tuesday</h4>
                            <div className="clearance-flat"></div>
                            <label className="full">
                                <p>Email</p>
                                <input type="email" name="email"></input>
                            </label>
                            <label className="full">
                                <p>Phone Number</p>
                                <input type="tel" name="phone"></input>
                            </label>
                            <label className="full">
                                <p>Whatsapp Number</p>
                                <input type="tel" name="whatsapp"></input>
                            </label>
                            <div className="spacer"></div>

                            <select name="gender">
                                <option value={"male"}>Male</option>
                                <option value={"female"}>Female</option>
                            </select>

                            <label className="full">
                                <p>First Name</p>
                                <input type="text" name="firstName"></input>
                            </label>

                            <label className="full">
                                <p>Last Name</p>
                                <input type="text" name="lastName"></input>
                            </label>

                            {target.company ?
                                <label className="full">
                                    <p>Company Name</p>
                                    <input type="text" name="companyName"></input>
                                </label> :
                                null}


                            {target.birthday ?
                                <label className="full">
                                    <p>Birthday</p>
                                    <input
                                        name="birthday"
                                        type="date"
                                        id="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </label> : null}


                            <span>
                                <input
                                    onInput={() => setShowSubmit((prev) => !prev)}
                                    type="checkbox"
                                ></input>
                                <p>
                                    I confirm that I have a valid proof of identification and
                                    consent to present it at the venue.
                                </p>
                            </span>

                            <div className="cta-zone">
                                <button
                                    onClick={handleSubmitRegistration}
                                    type="button"
                                    className={`cta-button blue ${showSubmit ? "show" : ""}`}
                                >
                                    <p>Submit</p>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {target.lockRegistration ? <div class="locked-overlay-message">
                Registration has been closed!
            </div> : null}

        </>
    );
};

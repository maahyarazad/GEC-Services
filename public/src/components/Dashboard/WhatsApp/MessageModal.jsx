import React from "react";
import { Button, CircularProgress, Switch, IconButton, Tooltip } from "@mui/material";
import { IoMdAdd } from "react-icons/io";
import { TiDelete } from "react-icons/ti";
import Modal from "../../Modal"
import { useAppSelector } from "../../../store/hooks";
import { getEvents } from "../../../features/eventSlice";
import EventDropdownSearch from "./EventDropdownSearch";
import { BsExclamationTriangleFill } from "react-icons/bs";
const MessageModal = ({
    state,
    handleMessageStateChange,
    handleSubmit,
    normalizePhone,
}) => {

    const {
        massAction,
        testAction,
        content,
        useContactBook,
        useTestBook,
        useLanguage,
        useAudience,
        inputValue,
        phone,
        phoneList,
        loadingMassSend,
        senderLimit,
        eventId,
    } = state;


    const events = useAppSelector(getEvents);

    return (
        <Modal
            isOpen={massAction}
            onRequestClose={() => {

                handleMessageStateChange('testAction', false);
                handleMessageStateChange('massAction', false);

            }}
            title={`${content?.friendlyName}`}
        >
            <div className="">

                <div className="d-flex flex-column mx-0 px-0 my-2 card pb-2 pt-1">
                    <div className="row g-3 px-3">

                        {/* LEFT COLUMN */}
                        <div className="col-12 col-lg-6 d-flex flex-column gap-1">

                            <EventDropdownSearch
                                events={events}
                                eventId={eventId}
                                onSelect={handleMessageStateChange}
                            />

                            <div>
                                <label className="form-label">Audience:</label>
                                <select
                                    name="type"
                                    value={useAudience}
                                    onChange={(e) => handleMessageStateChange("useAudience", e.target.value)}
                                    required
                                    className="form-select"
                                >
                                    <option value="all">All</option>
                                    <option value="gec_staff">GEC Staff</option>
                                    <option value="club_partner">Club Partner</option>
                                    <option value="club_member">Club Member</option>
                                    <option value="expert">Expert</option>
                                    <option value="expert_guest">Expert Guest</option>
                                    <option value="difa">Difa</option>
                                    <option value="only_guest">Guest</option>
                                    <option value="Wüstenkinder">Wüstenkinder</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Set Limit for Sender:</label>



                                {
                                    useAudience === 'all' && (
                                        <Tooltip style={{ marginLeft: 10, fontWeight: 800 }}
                                            title={
                                                <>
                                                    Select All Ignore the limit and use the entire Whastapp Sender bandwidth
                                                </>
                                            }
                                        >

                                            <BsExclamationTriangleFill color="orange" size={20} />
                                        </Tooltip>
                                    )
                                }



                                <select
                                    name="type"
                                    value={senderLimit}
                                    onChange={(e) => handleMessageStateChange("senderLimit", e.target.value)}
                                    required
                                    className="form-select"
                                >
                                    <option value={1000}>1000</option>
                                    <option value={500}>500</option>
                                    <option value={200}>200</option>
                                    <option value={100}>100</option>
                                    <option value={50}>50</option>
                                    <option value={10}>10</option>
                                </select>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="col-12 col-lg-6 d-flex flex-column justify-content-center gap-1 mt-2">
                            <label className="form-label">Sender Settings:</label>
                            <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2">


                                <span>

                                    <label className="form-label mb-0">Use Contact Book</label>
                                    {
                                        useContactBook && (
                                            <Tooltip style={{ marginLeft: 10, fontWeight: 800 }}
                                                title={
                                                    <>
                                                        ⚠️ Sending to Contact Book.<br />
                                                        • Only contacts with a phone number will receive this message<br />
                                                        • Anyone already invited to this event will be skipped<br />
                                                        • Previously messaged contacts will be skipped<br />
                                                        • Blacklisted contacts will be skipped<br />
                                                        • If the same phone number appears twice, only one message will be sent
                                                    </>
                                                }
                                            >

                                                <BsExclamationTriangleFill color="red" size={20} />
                                            </Tooltip>
                                        )
                                    }
                                </span>


                                <Switch
                                    size="small"
                                    checked={useContactBook}
                                    onChange={(e) => handleMessageStateChange("useContactBook", e.target.checked)}
                                    color="primary"
                                />
                            </div>

                            <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                <label className="form-label mb-0">Use Test Book</label>
                                <Switch
                                    size="small"
                                    checked={useTestBook}
                                    onChange={(e) => handleMessageStateChange("useTestBook", e.target.checked)}
                                    color="primary"
                                />
                            </div>

                            <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
                                <label className="form-label mb-0">Pick Language From Contact Book</label>
                                <Switch
                                    size="small"
                                    checked={state.useLanguage}
                                    onChange={(e) => handleMessageStateChange("useLanguage", e.target.checked)}
                                    color="primary"
                                />
                            </div>

                        </div>

                    </div>
                </div>


                <form onSubmit={handleSubmit} >

                    {/* VARIABLES */}
                    <div className="row mx-0 p-0 w-100">

                        <div
                            className={`col-lg-4 col-12 p-0 mx-0 card ${Object.keys(content?.variables ?? {}).length === 0
                                ? " d-none"
                                : ""
                                }`}
                        >
                            <div className="p-2 ">
                                {content?.variables &&
                                    Object.keys(content.variables).map((key) => (
                                        <div key={key}>
                                            <label htmlFor={`variable-${key}`}>
                                                Variable {key}
                                            </label>

                                            <input
                                                id={`variable-${key}`}
                                                type="text"
                                                value={inputValue[key] || ""}
                                                onChange={(e) =>
                                                    handleMessageStateChange("inputValue", {
                                                        ...state.inputValue,
                                                        [key]: e.target.value,
                                                    })
                                                }
                                                placeholder={content.variables[key]}
                                                required
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* PHONE INPUT */}
                        <div
                            className={`col-lg-8 col-12 m-0 px-4 py-2 card${massAction ? "" : "d-none"
                                } ${useContactBook || useTestBook ? "d-none" : ""}`}
                        >
                            <div className="p-2">

                                <div className="d-flex flex-column justify-content-start">
                                    <div>
                                        <label htmlFor="test-input">Recipient phone number:</label>
                                        <input
                                            id="test-input"
                                            type="tel"
                                            value={phone || ''}
                                            onChange={(e) =>
                                                handleMessageStateChange(
                                                    "phone",
                                                    normalizePhone(e.target.value)
                                                )
                                            }
                                            placeholder="+971501234567"
                                            pattern="^\+?[0-9]{7,15}$"
                                        />

                                        <IconButton
                                            onClick={() => {
                                                if (!state.phone) return;

                                                handleMessageStateChange("phoneList", [
                                                    ...state.phoneList,
                                                    {
                                                        id: Date.now().toString(),
                                                        phone: normalizePhone(state.phone),
                                                    },
                                                ]);

                                                handleMessageStateChange("phone", "");
                                            }}
                                        >
                                            <IoMdAdd />
                                        </IconButton>
                                    </div>

                                    <ul>
                                        {phoneList.map(({ id, phone }) => (
                                            <li
                                                key={id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <span>{phone}</span>
                                                <IconButton
                                                    type="button"
                                                    onClick={() => {
                                                        handleMessageStateChange(
                                                            "phoneList",
                                                            state.phoneList.filter((item) => item.id !== id)
                                                        );
                                                    }}
                                                >
                                                    <TiDelete color="red" />
                                                </IconButton>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>


                        </div>

                        {/* CONTACT BOOK INFO */}
                        <div
                            className={` ${useContactBook || useTestBook ? "col-lg-8 col-12 m-0 px-4 py-2 card" : "d-none"
                                }`}
                        >
                            <div className="p-0">
                                <p>
                                    When you want to send personalized WhatsApp messages, you can
                                    tell the system which information to include for each person by
                                    typing special keywords separated by spaces.
                                </p>

                                <p>
                                    For example, if you type{" "}
                                    <code>"first_name last_name"</code>, the message will include
                                    the person’s first name and last name together.
                                </p>

                                <p>
                                    <strong>Here are the keywords you can use:</strong>
                                </p>

                                <ul>
                                    <li><code>id</code> — The person’s unique ID</li>
                                    <li><code>title</code> — Their title</li>
                                    <li><code>first_name</code> — Their first name</li>
                                    <li><code>last_name</code> — Their last name</li>
                                    <li><code>gender</code> — Their gender</li>
                                    <li><code>phone</code> — Their phone number</li>
                                    <li><code>type</code> — Their contact type</li>
                                    <li><code>club_partner_name</code> — Club or partner</li>
                                    <li><code>blacklist</code> — Blacklist status</li>
                                </ul>

                                <p>
                                    Combine them with spaces, e.g.{" "}
                                    <code>"first_name last_name title"</code>.
                                </p>
                            </div>
                        </div>
                    </div>


                    <div className="row p-0 m-0 w-100">
                        <div className="col-12 m-0 p-0">
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ textTransform: "none", width: "100%" }}
                                type="submit"
                                disabled={loadingMassSend ? true : useContactBook || useTestBook ? false : phoneList.length === 0}
                                startIcon={
                                    loadingMassSend ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : null
                                }
                            >
                                {loadingMassSend ? "Sending..." : "Send Message"}
                            </Button>
                        </div>
                    </div>


                </form>
            </div>
        </Modal>
    );
};

export default MessageModal;

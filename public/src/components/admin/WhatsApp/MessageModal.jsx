import React from "react";
import { Button, CircularProgress, Switch, IconButton } from "@mui/material";
import { IoMdAdd } from "react-icons/io";
import { TiDelete } from "react-icons/ti";
import Modal from "../../Modal"

const MessageModal = ({
    massAction,
    setMassAction,
    setTestAction,
    content,
    useContactBook,
    useTestBook,
    setUseContactBook,
    setUseTestBook,
    handleSubmit,
    inputValue,
    setInputValue,
    phone,
    SetPhone,
    phoneList,
    SetPhoneList,
    normalizePhone,
    loadingMassSend,
}) => {
    return (
        <Modal
            isOpen={massAction}
            onRequestClose={() => {
                setTestAction(false);
                setMassAction(false);
            }}
            title={`Test Message → ${content?.friendlyName}`}
        >
            <div className="">
                <label htmlFor="test-input">Use Contact Book</label>

                <Switch
                    size="small"
                    title="Use Contact Book"
                    checked={useContactBook}
                    onChange={(e) => setUseContactBook(e.target.checked)}
                    color="primary"
                />
                <label htmlFor="test-input">Use Test Book</label>

                <Switch
                    size="small"
                    title="Use Contact Book"
                    checked={useTestBook}
                    onChange={(e) => setUseTestBook(e.target.checked)}
                    color="primary"
                />

                <form onSubmit={handleSubmit}>
                    <div className="row m-0 p-0 w-100">
                        {/* VARIABLES */}
                        <div
                            className={`col-lg-4 col-12 p-0 m-0${Object.keys(content?.variables ?? {}).length === 0
                                ? " d-none"
                                : ""
                                }`}
                        >
                            <div className="p-2">
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
                                                    setInputValue((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
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
                            className={`col-lg-8 m-0 p-0 col-12 ${massAction ? "" : "d-none"
                                } ${useContactBook || useTestBook? "d-none" : ""}`}
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
                                                SetPhone(normalizePhone(e.target.value))
                                            }
                                            placeholder="+971501234567"
                                            pattern="^\+?[0-9]{7,15}$"
                                        />

                                        <IconButton
                                            onClick={() => {
                                                if (!phone) return;
                                                SetPhoneList((prev) => [
                                                    ...prev,
                                                    {
                                                        id: Date.now().toString(),
                                                        phone: normalizePhone(phone),
                                                    },
                                                ]);
                                                SetPhone("");
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
                                                        SetPhoneList((prev) =>
                                                            prev.filter((item) => item.id !== id)
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
                            className={` ${useContactBook || useTestBook ? "col-lg-8 col-12 m-0 p-0" : "d-none"
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


                <div className="row p-0 m-0">
                    <div className="col-12 m-0 p-0">
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ textTransform: "none", width: "100%" }}
                            type="submit"
                            disabled={useContactBook|| useTestBook ? false : phoneList.length === 0}
                            startIcon={
                                loadingMassSend ? (
                                    <CircularProgress size={20} color="inherit" />
                                ) : null
                            }
                        >
                            Send Message
                        </Button>
                    </div>
                </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default MessageModal;

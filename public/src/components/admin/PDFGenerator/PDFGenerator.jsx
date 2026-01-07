import React, { useRef, useState, useEffect, useCallback } from "react";



import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import isEqual from "lodash.isequal";

import './PDFGenerator.css';

const Invoice = React.lazy(() => import("./Invoice"));
const FileList = React.lazy(() => import("./FileList"));
import { GrCurrency } from "react-icons/gr";

const PDFGenerator = () => {


    // const handleKeyDown = (e) => {
    //     if (e.key === "Backspace") {
    //         const textarea = e.target;
    //         const { selectionStart, selectionEnd, value } = textarea;

    //         // Split value into lines
    //         const lines = value.split(/\r?\n/);

    //         // Determine current line index based on caret position
    //         const beforeCaret = value.slice(0, selectionStart);
    //         const currentLineIndex = beforeCaret.split(/\r?\n/).length - 1;
    //         const currentLine = lines[currentLineIndex];

    //         // CASE 1: Prevent line merge or deletion at line start
    //         // if (selectionStart === selectionEnd && currentLine.trim() === "" && selectionStart > 0) {
    //         //   e.preventDefault(); // stop default backspace
    //         //   console.log("Prevented deleting empty line");
    //         //   return;
    //         // }

    //         // // CASE 2: Prevent line merge when caret at beginning of line
    //         // const lineStartPosition = beforeCaret.lastIndexOf("\n") + 1;
    //         // if (selectionStart === lineStartPosition) {
    //         //   e.preventDefault();
    //         //   console.log("Prevented merging lines");
    //         //   return;
    //         // }

    //         // Otherwise, let Backspace work normally
    //     }
    // };



    const printRef = useRef();
    const now = new Date();
    const this_month = `${String(now.getMonth() + 1).padStart(2, "0")}`;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const formattedDate = `${year}${month}${day}`;

    const _initial_formData = {
        project: {
            project_name: "Website Transtlation 2025",
            project_name_ll2: "OFFER/ANGEBOT",
            project_name_code: `#FG${formattedDate}`,
        },
        company: {
            company_name: "MARSTON-DOMSEL GMBH",
            company_address: "",
            company_postal_city: "",
            company_country: "",
        },

        reference: {
            reference_number: "",
            reference_contact_person_name_1: "Martin Esser",
            reference_contact_person_number_1: "0049-172 2696933",
            reference_contact_person_email_1: "esser@marston-domsel.de",
            reference_contact_person_name_2: "Gianfranco Confuorti",
            reference_contact_person_number_2: "00971-58-876 27 80",
            reference_contact_person_email_2: "procurement1@german-emirates-club.com",
            date: `${day}/${month}/${now.getFullYear()}`
        },

        bank_detail: {
            account_name: "German World Club",
            bank_name: "WIO Bank",
            bank_address: "Etihad Airways Centre",
            account_number: "1200563292001",
            iban: "AE 10 0860 0000 0998 4546 965",
            swift: "WIOBAEADXXX",
        },

        payment_terms: {
            line1: "100% at time of signing (one time)",
            line2: "",
            signature_left_name: "Gianfranco Confuorti",
            signature_left_title: "Chief Relationship Office",
            signature_right_name: "Rafael Mondonedo",
            signature_right_title: "Project Manager",
            signature_bottom_right_name: "",
            signature_bottom_right_title: "",
            signature_bottom_right_company: "",
        },
        items_price: false,
        items: [
            { deleted: false, title: "Item Title", price: "100 AED", qty: "1", disc: "0.00", vat: "0.00", vat_p: "0", amount: "", body: "is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum." },
        ],
        currency: {
            currency_enable: false,
            currency_symbol: "USD",
            currency_rate: 3.67,
        }
    }
    const [formData, setFormData] = useState(_initial_formData);
    const [objectChanged, setObjectChanged] = useState(false);

    const UpdateForm = (data) => { setFormData(data); }


    useEffect(() => {

        setObjectChanged(!isEqual(_initial_formData, formData));
        // console.log(`parent => ${objectChanged}`)
    }, [formData]);



    

    const _objectChanged = () => { return objectChanged };

    // Add a new empty item
    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { deleted: false, title: "Item Title", price: "", qty: "1", disc: "0.00", vat: "0.00", vat_p: "0", amount: "", body: "" }],
        }));
    };

    // Remove item by index
    const removeItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, deleted: true } : item
            ),
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nameParts = name.split('.'); // e.g. ["items", "0", "price"] or ["company", "company_name"]

        if (nameParts[0] === 'items') {
            // Update an item in the items array
            const index = parseInt(nameParts[1], 10);
            const key = nameParts[2];

            setFormData((prev) => {
                // Defensive: check index and key exist
                if (isNaN(index) || !key) return prev;

                const updatedItems = [...prev.items];
                const updatedItem = { ...updatedItems[index], [key]: value };
                updatedItems[index] = updatedItem;

                return { ...prev, items: updatedItems };
            });
        } else {
            // Handle nested keys in other parts, e.g. project.project_name
            const topKey = nameParts[0];
            const subKey = nameParts[1] || null;

            setFormData((prev) => {
                if (!topKey) return prev;

                if (subKey) {
                    // Nested object update
                    return {
                        ...prev,
                        [topKey]: {
                            ...prev[topKey],
                            [subKey]: value,
                        },
                    };
                } else {
                    // Direct key update
                    return {
                        ...prev,
                        [topKey]: value,
                    };
                }
            });
        }
    };



    const tabstyle = {
        backgroundColor: "#00000",      // background of the header
        color: "#fffff",                // text color
        "& .MuiAccordionSummary-expandIconWrapper": {
            color: "#fffff",             // icon color
        },
        '&.Mui-expanded': {
            bgcolor: '#037bfc',
            '& .MuiTypography-root': {
                color: '#fff',   // text color when expanded
            },
            '& .MuiSvgIcon-root': {
                color: '#fff',   // expand icon color when expanded
            },
        },

    }
    return (
        <Box sx={{ padding: 1 }}>
            <div className="row">

                <div className="col-2">

                    <FileList onSelect={UpdateForm} formData={formData} initialFormData={_initial_formData} />

                </div>
                <div className="col-10">

                    <div className="row" >

                        {/* Form to update PDF content */}
                        <div className="col-lg-6 col-12 left-panel" style={{ height: 'calc(100vh - 155px)', overflow: 'scroll' }}>

                            <form style={{ display: 'block' }}>
                                <Accordion>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel2-content"
                                        id="panel2-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">Project & Company Details</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box sx={{ width: "100%" }}>
                                            <div className="d-flex">
                                                <div className="col form-control">
                                                    {Object.entries(formData.project).map(([key, value]) => (
                                                        <div key={key} className="input-group">
                                                            <input
                                                                name={`project.${key}`}
                                                                value={value}
                                                                onChange={handleChange} // use nested handler to update nested state
                                                                placeholder={key.replace(/_/g, " ")}
                                                                style={{ width: "100%", padding: 4 }}
                                                            />
                                                            <label>
                                                                {key.replace(/_/g, " ")}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="col form-control">

                                                    {Object.entries(formData.company).map(([key, value]) => (
                                                        <div key={key} className="input-group">
                                                            <input
                                                                name={`company.${key}`}
                                                                value={value}
                                                                onChange={handleChange} // use nested handler to update nested state
                                                                placeholder={key.replace(/_/g, " ")}
                                                                style={{ width: "100%", padding: 4 }}
                                                            />
                                                            <label>
                                                                {key.replace(/_/g, " ")}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>



                                        </Box>

                                    </AccordionDetails>
                                </Accordion>


                                <Accordion >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel3-content"
                                        id="panel3-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">Project Reference</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box sx={{ width: "100%" }}>
                                            <div className="form-control">

                                                {Object.entries(formData.reference).map(([key, value]) => (
                                                    <div key={key} className="input-group">
                                                        <input
                                                            name={`reference.${key}`}
                                                            value={value}
                                                            onChange={handleChange} // use nested handler to update nested state
                                                            placeholder={key.replace(/_/g, " ")}
                                                            style={{ width: "100%", padding: 4 }}
                                                        />
                                                        <label>
                                                            {key.replace(/_/g, " ")}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>


                                        </Box>
                                    </AccordionDetails>

                                </Accordion>


                                <Accordion>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel2-content"
                                        id="panel2-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">Descriptions

                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box sx={{ width: "100%" }}>


                                            <div className="d-flex flex-column" style={{ marginBottom: 10, borderBottom: "1px solid #ccc", paddingBottom: 8 }}>
                                                <div>


                                                    <Switch size="small"
                                                        title="Enable (Dummy String) Price Column"
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                items_price: checked
                                                            }));
                                                        }}
                                                        checked={!!formData?.items_price}
                                                        color="primary"

                                                    />

                                                    <small style={{ fontSize: 13, paddingRight: 10 }}>Enable (Dummy String) Price Column</small>
                                                </div>
                                                <div>

                                                    <Switch
                                                        size="small"
                                                        title="Add Currency"
                                                        color="primary"
                                                        checked={formData.currency?.currency_enable}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                currency: {
                                                                    ...prev.currency,
                                                                    currency_enable: checked
                                                                }
                                                            }));


                                                        }}
                                                    />
                                                    <small style={{ fontSize: 14, paddingRight: 10 }}>Enable Currency</small>
                                                </div>

                                                <div className={`${formData.currency?.currency_enable ? "d-flex" : "d-none"} mt-3`}>

                                                    {formData.currency && Object.entries(formData.currency).map(([key, value]) =>
                                                        key !== 'currency_enable' &&
                                                        (

                                                            <div key={key} className="input-group">
                                                                <input
                                                                    name={`currency.${key}`}
                                                                    value={value}
                                                                    onChange={handleChange} // use nested handler to update nested state
                                                                    placeholder={key.replace(/_/g, " ")}
                                                                    style={{ width: "100%", padding: 4 }}
                                                                />
                                                                <label>
                                                                    {key.replace(/_/g, " ")}
                                                                </label>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="form-control">

                                                {formData.items.map((item, index) => {
                                                    // Use item.id if available, else fallback to index (less ideal if items can reorder)
                                                    const key = item.id ?? index;

                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`d-flex flex-column ${item.deleted ? "d-none":  ""}`}
                                                            style={{
                                                                marginBottom: 10,
                                                                borderBottom: "1px solid #ccc",
                                                                paddingBottom: 8,
                                                            }}
                                                        >
                                                            {Object.keys(item).map((key) => {
                                                                switch (key) {
                                                                    case "deleted":
                                                                        return (
                                                                           null
                                                                        );
                                                                    case "body":
                                                                        return (
                                                                            <div className="input-group" key={`${index}-${key}`}>
                                                                                <textarea
                                                                                    rows={3}
                                                                                    name={`items.${index}.${key}`}
                                                                                    value={item[key]}
                                                                                    onChange={handleChange}
                                                                                    placeholder={key.replace(/_/g, " ")}
                                                                                />
                                                                                <label>{key.replace(/_/g, " ")}</label>
                                                                            </div>
                                                                        );

                                                                    case "price":
                                                                        return formData.items_price ? (
                                                                            <div className="input-group" key={`${index}-${key}`}>
                                                                                <input
                                                                                    name={`items.${index}.${key}`}
                                                                                    value={item[key]}
                                                                                    onChange={handleChange}
                                                                                    placeholder={key.replace(/_/g, " ")}
                                                                                />
                                                                                <label>{key.replace(/_/g, " ")}</label>
                                                                            </div>
                                                                        ) : null;

                                                                    default:
                                                                        return (
                                                                            <div className="input-group" key={`${index}-${key}`}>
                                                                                <input
                                                                                    name={`items.${index}.${key}`}
                                                                                    value={item[key]}
                                                                                    onChange={handleChange}
                                                                                    placeholder={key.replace(/_/g, " ")}
                                                                                />
                                                                                <label>{key.replace(/_/g, " ")}</label>
                                                                            </div>
                                                                        );
                                                                }
                                                            })}

                                                            <Button
                                                                variant="contained"
                                                                sx={{ textTransform: "none" }}
                                                                size="small"
                                                                type="button"
                                                                color="error"
                                                                onClick={() => removeItem(index)}
                                                                style={{ marginTop: 4 }}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    );
                                                })}



                                                <Button type="button"
                                                    variant="outlined"
                                                    color="info"
                                                    size="small"
                                                    sx={{ textTransform: 'none' }}
                                                    onClick={addItem}>
                                                    Add Item
                                                </Button>
                                            </div>
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>


                                <Accordion>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel2-content"
                                        id="panel2-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">Bank Details</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box style={{ width: '100%' }}>
                                            <div className="d-flex">
                                                <div className="col form-control">
                                                    {Object.entries(formData.bank_detail).map(([key, value]) => (
                                                        <div key={key} className="input-group">
                                                            <input
                                                                name={`bank_detail.${key}`}
                                                                value={value}
                                                                onChange={handleChange} // use nested handler to update nested state
                                                                placeholder={key.replace(/_/g, " ")}
                                                                style={{ width: "100%", padding: 4 }}
                                                            />
                                                            <label>
                                                                {key.replace(/_/g, " ")}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </Box>


                                    </AccordionDetails>
                                </Accordion>


                                <Accordion>
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls="panel2-content"
                                        id="panel2-header"
                                        sx={tabstyle}
                                    >
                                        <Typography component="span">Payment Terms</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box style={{ width: '100%' }}>
                                            <div className="d-flex">
                                                <div className="col form-control">
                                                    {Object.entries(formData.payment_terms).map(([key, value]) => (
                                                        <div key={key} className="input-group">
                                                            <input
                                                                name={`payment_terms.${key}`}
                                                                value={value}
                                                                onChange={handleChange} // use nested handler to update nested state
                                                                placeholder={key.replace(/_/g, " ")}
                                                                style={{ width: "100%", padding: 4 }}
                                                            />
                                                            <label>
                                                                {key.replace(/_/g, " ")}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </Box>


                                    </AccordionDetails>
                                </Accordion>
                            </form>

                        </div>

                        <div className="col-lg-6 col-12">
                            <Invoice formData={formData} />
                        </div>
                    </div>
                </div>
            </div>
        </Box>
    );
};

export default PDFGenerator;

import React, { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import GEC_logo from "../../../assets/media/gec-logo.webp";

import { Box, Tooltip } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { IoIosSwap } from "react-icons/io";



import './PDFGenerator.css';

const PDFGenerator = () => {
    const printRef = useRef();
    const now = new Date();
    const this_month = `${String(now.getMonth() + 1).padStart(2, "0")}`;
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const formattedDate = `${year}${month}${day}`;

    // Form state
    const [formData, setFormData] = useState({
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
            account_number: "9984546965",
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

        items: [
            { title: "Item Title", qty: "1", disc: "0.00", vat: "0.00", vat_p: "0", amount: "", body: "is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum." },
        ]
    });

    // Add a new empty item
    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { title: "Item Title", qty: "1", disc: "0.00", vat: "0.00", vat_p: "0", amount: "", body: "" }],
        }));
    };

    // Remove item by index
    const removeItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };


    const handleChange = (e) => {
        const { name, value } = e.target; // e.g., "customer.name" or "items.0.value"
        const keys = name.split(".");     // split into array

        setFormData((prev) => {
            const updated = { ...prev };
            let temp = updated;


            // Traverse the nested object except the last key
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];

                // If array index
                if (key.match(/^\d+$/)) {
                    temp = temp[parseInt(key)];
                } else {
                    temp = temp[key];
                }
            }

            // Update the last key
            const lastKey = keys[keys.length - 1];
            if (lastKey.match(/^\d+$/)) {
                temp[parseInt(lastKey)] = value;
            } else {
                temp[lastKey] = value;
            }

            return { ...updated };
        });
    };


    // Generate PDF
    const handleDownloadPdf = async () => {
        const element = printRef.current;
        // Maahyar CM: We can use scale 2 or 3 for high resulotion
        const canvas = await html2canvas(element, {
            scale: 1,
            ignoreElements: (el) => el.classList.contains("swap-button")
        });

        // 0.8 also reduce the size
        const imgData = canvas.toDataURL("image/png", 0.7);

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // PNG for high resolution
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

        pdf.save(`Procurement-${formData.project.project_name}-${formData.project.project_name_code}.pdf`);
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
            <div className='row mb-1'>
                <div className='col-12 d-lg-flex justify-content-end'>
                    <div className='d-lg-flex'>

                        <Button onClick={handleDownloadPdf}
                            sx={{ textTransform: 'none' }}
                            size="small"
                            variant="contained">
                            Download PDF
                        </Button>

                    </div>

                </div>

            </div>
            <div className="row" style={{ height: '85vh', overflow: 'scroll' }}>
                {/* Form to update PDF content */}
                <div className="col-lg-6 col-12 left-panel">

                    <form style={{ display: 'block' }}>
                        <Accordion defaultExpanded>
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
                                <Typography component="span">Descriptions</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ width: "100%" }}>
                                    <div className="form-control">

                                        {formData.items.map((item, index) => (
                                            <div
                                                key={index}
                                                className="d-flex flex-column"
                                                style={{ marginBottom: 10, borderBottom: "1px solid #ccc", paddingBottom: 8 }}
                                            >
                                                {Object.keys(item).map((key) => {
                                                    switch (key) {
                                                        case "body":
                                                            return (
                                                                <div className="input-group" key={key}>
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

                                                        default:
                                                            return (
                                                                <div className="input-group" key={key}>
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
                                                    sx={{ textTransform: 'none' }}
                                                    size="small"
                                                    type="button"
                                                    color="error"
                                                    onClick={() => removeItem(index)}
                                                    style={{ marginTop: 4 }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}

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

                {/* Div to be captured as PDF */}
                <div ref={printRef} className="print-container col-lg-6 col-12">
                    <div className="header">
                        <img src={GEC_logo} alt="logo" />
                        <div className="project-info">
                            <p>{formData.project.project_name}</p>
                            <p className="line2">{formData.project.project_name_ll2}</p>
                            <p className="code">{formData.project.project_name_code}</p>
                        </div>
                    </div>

                    <div className="company-info">
                        <div>
                            <p className="company-name">{formData.company.company_name}</p>
                            <p className="company-detail">{formData.company.company_address}</p>
                            <p className="company-detail">{formData.company.company_postal_city}</p>
                            <p className="company-detail">{formData.company.company_country}</p>
                        </div>
                    </div>

                    <div className="references">
                        <div>
                            <span>
                                References
                            </span>
                            <div className="info">

                                <p >{formData.reference.reference_number}</p>
                            </div>
                        </div>

                        <div>
                            <p className="">{formData.reference.reference_contact_person_name_1}</p>
                            <div className="info">

                                <p >{formData.reference.reference_contact_person_number_1}</p>
                                <p >{formData.reference.reference_contact_person_email_1}</p>
                            </div>
                        </div>
                        <div>
                            <p className="">{formData.reference.reference_contact_person_name_2}</p>
                            <div className="info">

                                <p >{formData.reference.reference_contact_person_number_2}</p>
                                <p >{formData.reference.reference_contact_person_email_2}</p>
                            </div>
                        </div>
                        <div>
                            <span>
                                Date
                            </span>
                            <div className="info">

                                <p >{formData.reference.date}</p>
                            </div>
                        </div>




                    </div>

                    <div className="description">
                        <table>
                            <thead>
                                <tr className="description-header">
                                    <th style={{ textAlign: "left" }}>Description</th>
                                    <th>QTY</th>
                                    <th>DISC</th>
                                    <th>VAT%</th>
                                    <th>VAT</th>
                                    <th>AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, index) => (
                                    <>
                                        <tr key={index} className="description">
                                            <td style={{ fontWeight: 700 }}>

                                                {item.title || "No Title"}
                                            </td>
                                            <td>{item.qty || "-"}</td>
                                            <td>{item.disc || "0%"}</td>
                                            <td>{item.vap_p || "0"}</td>
                                            <td>{item.vat || "-"}</td>
                                            <td >AED {item.amount || "0"}</td>
                                        </tr>
                                        <tr key={index} className="description-row">
                                            <td>

                                                {item.body.split("\n").map((line, i) => (
                                                    <span key={i}>
                                                        {line}
                                                        <br />
                                                    </span>
                                                ))}
                                            </td>

                                        </tr>
                                    </>
                                ))}

                            </tbody>
                        </table>
                    </div>

                    <div className="bank-detail">
                        <span>Bank Details</span>
                        {Object.entries(formData.bank_detail).map(([key, value]) => (
                            <div key={key} className="bank-detail-row">
                                <p className={`key ${key}`}>{key.replace(/_/g, " ")}</p>
                                <p className="value">{value}</p>
                            </div>
                        ))}

                    </div>


                    <div className="total">
                        <div className="left">
                            <div className="d-flex">

                                <p className="key">Subtotal</p>
                                <p>
                                    AED{" "}
                                    {formData.items && formData.items.length > 0
                                        ? formData.items
                                            .reduce((total, item) => total + (parseFloat(item.amount) || 0), 0)
                                            .toFixed(2)
                                        : "0.00"}
                                </p>

                            </div>
                            <div className="d-flex">
                                <span>total</span>
                                <span >
                                    AED{" "}
                                    {formData.items && formData.items.length > 0
                                        ? formData.items
                                            .reduce((total, item) => total + (parseFloat(item.amount) || 0), 0)
                                            .toFixed(2)
                                        : "0.00"}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex  right">
                            <p className="key">Reference:</p>
                            <p>Please mention <strong>{formData.reference.reference_number}</strong></p>
                        </div>
                    </div>


                    <div className="payment-terms">
                        <span>Payment Terms:</span>
                        {Object.entries(formData.payment_terms).map(([key, value]) => {

                            switch (key) {
                                case "line1":
                                    return (
                                        <div key={key}>
                                            <div className="payment-terms-row pb-3">
                                                <p className="value">{value}</p>
                                            </div>
                                            <span className="normal-span">Not Included in the offer:</span>
                                        </div>
                                    );

                                case "line2":
                                    return (
                                        <div key={key} className="payment-terms-row">
                                            <p className="value">{value}</p>
                                        </div>
                                    );


                            }
                        })}

                        <div className="signature">
                            <div className="signature-left">
                                <p className="value">{formData.payment_terms.signature_left_name}</p>
                                <p className="value">{formData.payment_terms.signature_left_title}</p>
                            </div>

                            <div className="signature-right">
                                <div className="swap-button">
                                    <Tooltip title="Swap Signatures">
                                    
                                        <Button 
                                        
                                            variant="text"
                                            onClick={() => {
                                                setFormData((prev) => {
                                                    const { signature_left_name, signature_left_title, signature_right_name, signature_right_title } =
                                                        prev.payment_terms;

                                                    return {
                                                        ...prev,
                                                        payment_terms: {
                                                            ...prev.payment_terms,
                                                            signature_left_name: signature_right_name,
                                                            signature_left_title: signature_right_title,
                                                            signature_right_name: signature_left_name,
                                                            signature_right_title: signature_left_title,
                                                        },
                                                    };
                                                });
                                            }}
                                        >
                                            <IoIosSwap size={30}/>
                                        </Button>
                                    </Tooltip>

                                </div>
                                <p className="value">{formData.payment_terms.signature_right_name}</p>
                                <p className="value">{formData.payment_terms.signature_right_title}</p>
                            </div>


                            <div className="signature-bottom-right">
                                <div class="sign-term">Understood, agreed, and accepted: </div>
                                <p className="value">{formData.payment_terms.signature_bottom_right_name}</p>
                                <p className="value">{formData.payment_terms.signature_bottom_right_title}</p>
                                <p className="value">{formData.payment_terms.signature_bottom_right_company}</p>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </Box>
    );
};

export default PDFGenerator;

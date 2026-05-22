import React, { useState, useEffect } from "react";

import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import './PDFGenerator.css';

const Invoice = React.lazy(() => import("./Invoice"));
const FileList = React.lazy(() => import("./FileList"));

const labelify = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const PDFGenerator = () => {
    const now = new Date();
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
    };

    const [formData, setFormData] = useState(_initial_formData);

    const UpdateForm = (data) => { setFormData(data); };

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { deleted: false, title: "Item Title", price: "", qty: "1", disc: "0.00", vat: "0.00", vat_p: "0", amount: "", body: "" }],
        }));
    };

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
        const nameParts = name.split('.');

        if (nameParts[0] === 'items') {
            const index = parseInt(nameParts[1], 10);
            const key = nameParts[2];
            setFormData((prev) => {
                if (isNaN(index) || !key) return prev;
                const updatedItems = [...prev.items];
                updatedItems[index] = { ...updatedItems[index], [key]: value };
                return { ...prev, items: updatedItems };
            });
        } else {
            const topKey = nameParts[0];
            const subKey = nameParts[1] || null;
            setFormData((prev) => {
                if (!topKey) return prev;
                if (subKey) {
                    return { ...prev, [topKey]: { ...prev[topKey], [subKey]: value } };
                }
                return { ...prev, [topKey]: value };
            });
        }
    };

    const tabstyle = {
        backgroundColor: '#000000',
        color: '#ffffff',
        "& .MuiAccordionSummary-expandIconWrapper": {
            color: '#ffffff',
        },
        '&.Mui-expanded': {
            bgcolor: '#037bfc',
            '& .MuiTypography-root': { color: '#fff' },
            '& .MuiSvgIcon-root': { color: '#fff' },
        },
    };

    const renderFields = (section, prefix) =>
        Object.entries(formData[section]).map(([key, value]) => (
            <TextField
                key={key}
                label={labelify(key)}
                name={`${prefix}.${key}`}
                value={value}
                onChange={handleChange}
                size="small"
                fullWidth
                sx={{ mb: 1.5 }}
            />
        ));

    return (
        <Box sx={{ padding: 1 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: 1.5,
                alignItems: 'flex-start',
            }}>
                {/* File list */}
                <Box sx={{ width: { xs: '100%', lg: '15%', height: { lg: 'calc(100vh - 125px)' } }, flexShrink: 0 }}>
                    <FileList onSelect={UpdateForm} formData={formData} initialFormData={_initial_formData} />
                </Box>

                {/* Form */}
                <Box sx={{
                    width: { xs: '100%', md: '35%' },
                    height: { lg: 'calc(100vh - 125px)' },
                    overflowY: { lg: 'scroll' },
                    flexShrink: 0,
                }} className='rounded border p-1'>
                    <form style={{ display: 'block' }}>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Project & Company Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        {renderFields('project', 'project')}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        {renderFields('company', 'company')}
                                    </Box>
                                </Box>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Project Reference</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('reference', 'reference')}
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Descriptions</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {/* Toggles */}
                                <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #ccc' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <Switch
                                            size="small"
                                            onChange={(e) => setFormData((prev) => ({ ...prev, items_price: e.target.checked }))}
                                            checked={!!formData?.items_price}
                                            color="primary"
                                        />
                                        <Typography variant="caption">Enable (Dummy String) Price Column</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <Switch
                                            size="small"
                                            color="primary"
                                            checked={!!formData.currency?.currency_enable}
                                            onChange={(e) => setFormData((prev) => ({
                                                ...prev,
                                                currency: { ...prev.currency, currency_enable: e.target.checked }
                                            }))}
                                        />
                                        <Typography variant="caption">Enable Currency</Typography>
                                    </Box>
                                    {formData.currency?.currency_enable && (
                                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                                            {Object.entries(formData.currency).map(([key, value]) =>
                                                key !== 'currency_enable' && (
                                                    <TextField
                                                        key={key}
                                                        label={labelify(key)}
                                                        name={`currency.${key}`}
                                                        value={value}
                                                        onChange={handleChange}
                                                        size="small"
                                                        sx={{ flex: 1 }}
                                                    />
                                                )
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                {/* Items */}
                                {formData.items.map((item, index) => {
                                    if (item.deleted) return null;
                                    return (
                                        <Box key={item.id ?? index} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                                            {Object.keys(item).map((key) => {
                                                if (key === 'deleted') return null;
                                                if (key === 'price' && !formData.items_price) return null;
                                                return (
                                                    <TextField
                                                        key={`${index}-${key}`}
                                                        label={labelify(key)}
                                                        name={`items.${index}.${key}`}
                                                        value={item[key]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        fullWidth
                                                        multiline={key === 'body'}
                                                        rows={key === 'body' ? 3 : undefined}
                                                        sx={{ mb: 1.5 }}
                                                    />
                                                );
                                            })}
                                            <Button
                                                variant="contained"
                                                size="small"
                                                type="button"
                                                color="error"
                                                sx={{ textTransform: 'none' }}
                                                onClick={() => removeItem(index)}
                                            >
                                                Remove
                                            </Button>
                                        </Box>
                                    );
                                })}

                                <Button type="button" variant="outlined" color="info" size="small" sx={{ textTransform: 'none' }} onClick={addItem}>
                                    Add Item
                                </Button>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Bank Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('bank_detail', 'bank_detail')}
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Payment Terms</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('payment_terms', 'payment_terms')}
                            </AccordionDetails>
                        </Accordion>

                    </form>
                </Box>

                {/* Invoice Preview */}
                <Box sx={{
                    width: { xs: '100%', md: '50%' },
                    flexShrink: 0,
                    height: { lg: 'calc(100vh - 125px)' },
                    overflowY: { lg: 'scroll' },
                }} className='rounded border p-1'>
                    <Invoice formData={formData} />
                </Box>

            </Box>
        </Box>
    );
};

export default PDFGenerator;

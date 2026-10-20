import React, { useEffect, useState } from "react";
import { CircularProgress } from '@mui/material';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

const downloadUrl = (mediaUrl) =>
    `${SERVER_URL}/api/whatsapp/download-media?mediaUrl=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(`contact_${Date.now()}.vcf`)}`;

// "+971 50 123 4567" → "971501234567" for wa.me links
const toWaDigits = (phone) => (phone.waId || phone.value).replace(/\D/g, "");

const VCardBubble = ({ media_url }) => {
    const [contacts, setContacts] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const fetchContacts = async () => {
            try {
                const response = await fetch(
                    `${SERVER_URL}/api/whatsapp/media-vcard?mediaUrl=${encodeURIComponent(media_url)}`,
                    { method: "GET", credentials: "include" }
                );
                const responseData = await response.json();

                if (cancelled) return;
                if (!response.ok || !responseData.contacts?.length) {
                    setError(true);
                } else {
                    setContacts(responseData.contacts);
                }
            } catch (err) {
                console.error(err);
                if (!cancelled) setError(true);
            }
        };

        fetchContacts();
        return () => { cancelled = true; };
    }, [media_url]);

    if (error) {
        return (
            <div className="vcard">
                <div className="vcard-name">Contact card</div>
                <a className="vcard-download" href={downloadUrl(media_url)}>Download .vcf</a>
            </div>
        );
    }

    if (!contacts) {
        return (
            <div className="vcard vcard-loading">
                <CircularProgress size={16} color="inherit" />
                <span>Loading contact…</span>
            </div>
        );
    }

    return (
        <div className="vcard">
            {contacts.map((contact, index) => (
                <div className="vcard-contact" key={index}>
                    <div className="vcard-name">{contact.name}</div>
                    {contact.org && <div className="vcard-org">{contact.org}</div>}

                    {contact.phones.map((phone, i) => (
                        <div className="vcard-row" key={`p${i}`}>
                            <a href={`tel:${phone.value.replace(/\s/g, "")}`}>{phone.value}</a>
                            {phone.type && <span className="vcard-type">{phone.type}</span>}
                            {toWaDigits(phone) && (
                                <a
                                    className="vcard-wa"
                                    href={`https://wa.me/${toWaDigits(phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    ))}

                    {contact.emails.map((email, i) => (
                        <div className="vcard-row" key={`e${i}`}>
                            <a href={`mailto:${email.value}`}>{email.value}</a>
                            {email.type && <span className="vcard-type">{email.type}</span>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default VCardBubble;

import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { createPortal } from 'react-dom';
import Typography from '@mui/material/Typography';
import { TbClipboardCheck } from "react-icons/tb";
import { FaCheckCircle } from "react-icons/fa";
import { FaExclamationCircle } from "react-icons/fa";
export interface Event {
    id: string | number;
    title: string;
}
export interface EventSpeedDialProps {
    params: any;
    _events: Array<Event>;
}

export default function EventSpeedDial({ _events, params }: EventSpeedDialProps) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0 });
    const [successEventId, setSuccessEventId] = React.useState<Number>();
    const [failedEventId, setFailedEventId] = React.useState<Number>();
    const successTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const failTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAddToGuestList = async (contactId: any, eventId: any) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/add-to-guest-list?contactId=${contactId}&eventId=${eventId}`,
                { credentials: "include" }
            );
            if (response.status === 200) {
                setSuccessEventId(eventId);
                if (successTimer.current) clearTimeout(successTimer.current); // clear any existing
                successTimer.current = setTimeout(() => setSuccessEventId(undefined), 3000);
            } else {
                setFailedEventId(eventId)
                if (failTimer.current) clearTimeout(failTimer.current); // clear any existing
                failTimer.current = setTimeout(() => setFailedEventId(undefined), 3000);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        }
    };

    useEffect(() => {
        return () => {
            if (successTimer.current) clearTimeout(successTimer.current); // cleanup on unmount
            if (failTimer.current) clearTimeout(failTimer.current); // cleanup on unmount
        };

    }, []);

    // /api/contacts/add-to-guest-list
    const cancelClose = () => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => setOpen(false), 100);
    };

    const handleTriggerEnter = () => {
        cancelClose();
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({ top: rect.top - 100, left: rect.left });
        }
        setOpen(true);
    };

    return (
        <>
            <IconButton
                ref={anchorRef}
                size="small"
                onMouseEnter={handleTriggerEnter}
                onMouseLeave={scheduleClose}
            >
                <TbClipboardCheck size={22} />
            </IconButton>

            {open &&
                createPortal(
                    <Box
                        sx={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            zIndex: 99999,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            backgroundColor: '', maxHeight: 100,
                            overflowY: "auto",
                            overflowX: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            background: '#d9dcde',
                            padding: 1,
                            borderRadius: 5
                        }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                    >
                        {_events?.length > 0 && _events.map((event) => (
                            <div key={event.id}>
                                <Box onClick={() => handleAddToGuestList(params.row.id, event.id)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 1.5,
                                        py: 0.75,
                                        backgroundColor: '#888c8f',
                                        border: '0.5px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        cursor: 'pointer',
                                        minWidth: 160,
                                        transition: 'background 0.15s',
                                        '&:hover': {
                                            color: '#585E62',

                                        },
                                    }}
                                >
                                    {successEventId === event.id
                                        ? <FaCheckCircle size={15} color="green" />
                                        : <></>
                                    }
                                    {failedEventId === event.id
                                        ? <FaExclamationCircle size={15} color="red" />
                                        : <></>
                                    }
                                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'white' }} >
                                        {`Add ${params.row.first_name} to ${event.title}’s guest list`}
                                    </Typography>
                                </Box>
                            </div>
                        ))}
                    </Box>,
                    document.body
                )}
        </>
    );
}
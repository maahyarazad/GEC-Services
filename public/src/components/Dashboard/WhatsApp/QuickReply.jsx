import React, { useEffect, useState, useCallback } from 'react';
import { useSnackbar } from '../../Providers/Snackbar';
import { Button, CircularProgress } from '@mui/material';
import ChatView from './ChatView';
import './QuickReply.css';

const QuickReply = ({ CloseModal, incoming_message }) => {
    const { showSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!message.trim()) {
                showSnackbar("Cannot send empty message", "warning");
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/quick-reply`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message, incoming_message }),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                console.error(responseData.error);
                showSnackbar(responseData.message, "error");
            } else {
                showSnackbar(responseData.message, "success");
                CloseModal();
            }
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/history/${incoming_message.WaId}`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                }
            );
            const responseData = await response.json();

            if (!response.ok) {
                console.error(responseData.error);
                showSnackbar(responseData.message, "error");
            } else {
                setHistory(responseData.result);
            }
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="container pt-2">
                <div className="py-2 d-flex justify-content-start align-items-stretch" style={{ minHeight: '50%' }}>
                    <ChatView messages={history} loadingHistory={loadingHistory} />
                </div>


                <div className="row">
                    <div className="col mb-3">
                        <label>Your Message:</label>
                        <textarea
                            rows={2}
                            name="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="form-control"
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={loading}
                            sx={{ textTransform: 'none', width: '100%' }}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? "Sending..." : "Send"}
                        </Button>
                    </div>
                </div>

            </div>
        </form>
    );
};

export default QuickReply;

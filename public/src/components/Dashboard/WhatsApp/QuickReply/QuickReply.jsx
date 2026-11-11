import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSnackbar } from '../../../Providers/Snackbar';
import { Button, CircularProgress } from '@mui/material';
import ChatView from '../ChatView/ChatView';
import './QuickReply.css';

// Must match HISTORY_PAGE_SIZE in services/whatsAppSender.js.
const HISTORY_PAGE_SIZE = 20;

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

    // Paging state: newest page first, older pages prepended on scroll-up.
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);

    const requestHistoryPage = useCallback(async (pageCursor) => {
        const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE) });
        if (pageCursor) params.set("cursor", pageCursor);

        const response = await fetch(
            `${import.meta.env.VITE_SERVERURL}/api/whatsapp/history/${incoming_message.WaId}?${params}`,
            {
                method: "GET",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            }
        );
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || "Failed to fetch WhatsApp history");
        }
        return responseData;
    }, [incoming_message.WaId]);

    const fetchHistory = useCallback(async () => {
        try {
            const page = await requestHistoryPage(null);
            setHistory(page.result || []);
            setCursor(page.nextCursor || null);
            setHasMore(Boolean(page.hasMore));
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
        } finally {
            setLoadingHistory(false);
        }
    }, [requestHistoryPage]);

    const loadMore = useCallback(async () => {
        if (!hasMore || !cursor || loadingMoreRef.current) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const page = await requestHistoryPage(cursor);
            setHistory((prev) => [...(page.result || []), ...prev]);
            setCursor(page.nextCursor || null);
            setHasMore(Boolean(page.hasMore));
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || "Unexpected error occurred", "error");
            setHasMore(false); // stop retrying on every scroll after a failure
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [hasMore, cursor, requestHistoryPage]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="container">
                    
                    
                    
                    <ChatView
                        messages={history}
                        loadingHistory={loadingHistory}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        onLoadMore={loadMore}
                    />
               


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

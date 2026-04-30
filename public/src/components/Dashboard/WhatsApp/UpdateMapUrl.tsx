import { useState, useEffect } from "react";
import { Box, TextField, Button, Alert, CircularProgress, Typography } from "@mui/material";

const UpdateMapUrl = () => {
    const [mapUrl, setMapUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchMapUrl = async () => {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/get-map-url`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.status) setMapUrl(data.data.google_map_url);
        };

        fetchMapUrl();
    }, []);

    const handleSubmit = async () => {
        if (!mapUrl.trim()) {
            setMessage({ text: 'Please enter a URL', type: 'error' });
            return;
        }

        try {
            setLoading(true);
            setMessage(null);

            const params = new URLSearchParams({ google_map_url: mapUrl });
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/whatsapp/update-map-url?${params}`,
                { method: 'PATCH', credentials: 'include' }
            );

            const responseData = await response.json();

            if (!response.ok) {
                setMessage({ text: responseData.message, type: 'error' });
                return;
            }

            setMessage({ text: 'Map URL updated successfully', type: 'success' });

        } catch (err) {
            setMessage({ text: 'Failed to update map URL', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minWidth: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={100}>
                Google Map URL
            </Typography>

            <TextField
                fullWidth
                size="small"
                label="Google Map URL"
                placeholder="https://maps.app.goo.gl/..."
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
            />

            {message && (
                <Alert severity={message.type}>
                    {message.text}
                </Alert>
            )}

            <Button
                fullWidth
                sx={{textTransform: 'none'}}
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
                {loading ? 'Updating...' : 'Update Map URL'}
            </Button>
        </Box>
    );
};

export default UpdateMapUrl;
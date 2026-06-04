import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Chip, Paper } from '@mui/material';
import { MdContentCopy, MdCheckCircle } from 'react-icons/md';

const API_KEY = 'AIzaSyA6myHzS10YXdcazAFalmXvDkrYCp5cLc8';

function ensureMapsScript() {
    if (window.google?.maps?.importLibrary) return Promise.resolve();
    if (document.getElementById('gec-maps-script')) {
        return new Promise((resolve) => {
            const check = () =>
                window.google?.maps?.importLibrary ? resolve() : setTimeout(check, 100);
            check();
        });
    }
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.id = 'gec-maps-script';
        s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&loading=async`;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

export default function PlaceIdFinder() {
    const [placeName, setPlaceName]       = useState('');
    const [placeId, setPlaceId]           = useState('');
    const [placeAddress, setPlaceAddress] = useState('');
    const [copied, setCopied]             = useState(false);
    const mapRef          = useRef(null);
    const autocompleteRef = useRef(null);

    const mapsUrl = placeId
        ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
        : '';

    useEffect(() => {
        let cancelled = false;

        async function init() {
            await ensureMapsScript();
            if (cancelled) return;

            await Promise.all([
                google.maps.importLibrary('maps'),
                google.maps.importLibrary('marker'),
                google.maps.importLibrary('places'),
            ]);
            if (cancelled) return;

            const { InfoWindow }           = await google.maps.importLibrary('maps');
            const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

            const mapEl  = mapRef.current;
            const autoEl = autocompleteRef.current;
            if (!mapEl || !autoEl) return;

            // Wait for the gmp-map custom element to expose innerMap after upgrade
            const map = await new Promise((resolve) => {
                const check = () =>
                    mapEl.innerMap ? resolve(mapEl.innerMap) : setTimeout(check, 50);
                check();
            });
            if (cancelled) return;

            map.setOptions({ clickableIcons: false, mapTypeControl: false, streetViewControl: false });
            map.addListener('bounds_changed', () => {
                const bounds = map.getBounds();
                if (bounds) autoEl.locationBias = bounds;
            });

            const infoWindow = new InfoWindow();
            const contentEl  = document.getElementById('gec-infowindow-content');
            infoWindow.setContent(contentEl);

            const marker = new AdvancedMarkerElement({
                map,
                collisionBehavior: 'REQUIRED_AND_HIDES_OPTIONAL',
                gmpClickable: true,
            });

            marker.addEventListener('gmp-click', () => infoWindow.open(map, marker));

            autoEl.addEventListener('gmp-select', async ({ placePrediction }) => {
                infoWindow.close();
                const place = placePrediction.toPlace();
                await place.fetchFields({
                    fields: ['displayName', 'formattedAddress', 'location', 'id'],
                });

                if (!place.location) return;

                if (place.viewport) map.fitBounds(place.viewport);
                else { map.setCenter(place.location); map.setZoom(17); }

                marker.position = place.location;

                const id      = place.id               ?? '';
                const name    = place.displayName      ?? '';
                const address = place.formattedAddress ?? '';

                setPlaceId(id);
                setPlaceName(name);
                setPlaceAddress(address);

                const nameEl = contentEl.querySelector('#gec-place-name');
                const idEl   = contentEl.querySelector('#gec-place-id');
                const addrEl = contentEl.querySelector('#gec-place-address');
                if (nameEl) nameEl.textContent = name;
                if (idEl)   idEl.textContent   = id;
                if (addrEl) addrEl.textContent  = address;

                infoWindow.open(map, marker);
            });
        }

        init().catch(console.error);
        return () => { cancelled = true; };
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(mapsUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', p: { xs: 1, md: 2 }, gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Google Maps Place ID Finder</Typography>

            <Box
                sx={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    minHeight: 300,
                }}
            >
                <gmp-map
                    ref={mapRef}
                    center="-33.8688, 151.2195"
                    zoom="13"
                    map-id="DEMO_MAP_ID"
                    style={{ width: '100%', height: '100%' }}
                >
                    <gmp-place-autocomplete
                        ref={autocompleteRef}
                        slot="control-inline-start-block-start"
                    />
                </gmp-map>
            </Box>

            {/* Hidden content element used by the Maps InfoWindow */}
            <div id="gec-infowindow-content" style={{ display: 'none' }}>
                <span id="gec-place-name" />
                <br />
                <strong>Place ID:</strong> <span id="gec-place-id" />
                <br />
                <span id="gec-place-address" />
            </div>

            {placeId && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{placeName}</Typography>
                        <Typography variant="body2" color="text.secondary">{placeAddress}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>Place ID:</Typography>
                            <Chip label={placeId} size="small" sx={{ fontFamily: 'monospace', fontSize: 12 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    wordBreak: 'break-all',
                                    flex: 1,
                                    fontFamily: 'monospace',
                                    fontSize: 11,
                                }}
                            >
                                {mapsUrl}
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={copied ? <MdCheckCircle size={16} /> : <MdContentCopy size={16} />}
                                onClick={handleCopy}
                                color={copied ? 'success' : 'primary'}
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                {copied ? 'Copied!' : 'Copy URL'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

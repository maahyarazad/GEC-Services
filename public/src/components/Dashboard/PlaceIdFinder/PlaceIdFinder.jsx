import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Chip, Paper, CircularProgress, Alert } from '@mui/material';
import { MdContentCopy, MdCheckCircle } from 'react-icons/md';

// Inject Google's bootstrapper as an inline script (runs synchronously,
// sets up google.maps.importLibrary immediately as a lazy-loading shim).
// Single-quoted outer string keeps backticks inside as literal characters.
function ensureMapsBootstrap(apiKey) {
    if (window.google?.maps?.importLibrary) return;
    if (document.getElementById('gec-maps-bootstrap')) return;
    const s = document.createElement('script');
    s.id = 'gec-maps-bootstrap';
    s.textContent = '(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({key:"' + apiKey + '"});';
    document.head.appendChild(s);
}

export default function PlaceIdFinder() {
    const [placeName, setPlaceName]       = useState('');
    const [placeId, setPlaceId]           = useState('');
    const [placeAddress, setPlaceAddress] = useState('');
    const [copied, setCopied]             = useState(false);
    const [initError, setInitError]       = useState('');
    const mapRef          = useRef(null);
    const autocompleteRef = useRef(null);

    const mapsUrl = placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}&query_place_id=${placeId}`
        : '';

    useEffect(() => {
        let cancelled = false;
        let mapInstance      = null;
        let markerInstance   = null;
        let infoWindowInstance = null;
        let boundsListener   = null;
        let autoElRef        = null;
        let markerClickHandler = null;
        let gmpSelectHandler   = null;

        async function init() {
            // Fetch API key from server — key is never in the client bundle
            const res = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/maps/config`,
                { credentials: 'include' }
            );
            if (!res.ok) throw new Error('Failed to load Maps configuration');
            const { apiKey } = await res.json();
            if (!apiKey) throw new Error('Maps API key not configured on server');
            if (cancelled) return;

            ensureMapsBootstrap(apiKey);

            const [{ InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
                google.maps.importLibrary('maps'),
                google.maps.importLibrary('marker'),
                google.maps.importLibrary('places'),
            ]);
            if (cancelled) return;

            const mapEl  = mapRef.current;
            const autoEl = autocompleteRef.current;
            if (!mapEl || !autoEl) return;

            autoElRef = autoEl;

            // Wait for gmp-map custom element to expose innerMap (max 5 s)
            const map = await new Promise((resolve, reject) => {
                let tries = 0;
                const check = () => {
                    if (mapEl.innerMap) return resolve(mapEl.innerMap);
                    if (tries++ > 100) return reject(new Error('gmp-map did not initialize'));
                    setTimeout(check, 50);
                };
                check();
            });
            if (cancelled) return;

            mapInstance = map;
            map.setOptions({ clickableIcons: false, mapTypeControl: false, streetViewControl: false });
            boundsListener = map.addListener('bounds_changed', () => {
                const bounds = map.getBounds();
                if (bounds) autoEl.locationBias = bounds;
            });

            const infoWindow = new InfoWindow();
            infoWindowInstance = infoWindow;
            const contentEl  = document.getElementById('gec-infowindow-content');
            infoWindow.setContent(contentEl);

            const marker = new AdvancedMarkerElement({
                map,
                collisionBehavior: 'REQUIRED_AND_HIDES_OPTIONAL',
                gmpClickable: true,
            });
            markerInstance = marker;

            markerClickHandler = () => infoWindow.open(map, marker);
            marker.addEventListener('gmp-click', markerClickHandler);

            gmpSelectHandler = async ({ placePrediction }) => {
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
            };
            autoEl.addEventListener('gmp-select', gmpSelectHandler);
        }

        init().catch((err) => {
            if (!cancelled) setInitError(err.message);
        });

        return () => {
            cancelled = true;

            if (boundsListener) {
                boundsListener.remove();
                boundsListener = null;
            }

            if (markerInstance) {
                if (markerClickHandler) {
                    markerInstance.removeEventListener('gmp-click', markerClickHandler);
                    markerClickHandler = null;
                }
                markerInstance.map = null;
                markerInstance = null;
            }

            if (infoWindowInstance) {
                infoWindowInstance.close();
                infoWindowInstance = null;
            }

            if (mapInstance) {
                if (window.google?.maps?.event) {
                    google.maps.event.clearInstanceListeners(mapInstance);
                }
                mapInstance = null;
            }

            if (autoElRef && gmpSelectHandler) {
                autoElRef.removeEventListener('gmp-select', gmpSelectHandler);
                autoElRef = null;
                gmpSelectHandler = null;
            }
        };
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

            {initError && (
                <Alert severity="error" sx={{ mb: 1 }}>{initError}</Alert>
            )}

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

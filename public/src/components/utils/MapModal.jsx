import React, { useRef, useEffect, useState, useCallback } from 'react';
import Modal from '../Modal';

const MapModal = ({ isOpen, onClose, onSelect, values }) => {
    const mapContainer = useRef(null);
    const markerRef = useRef(null);
    const mapRef = useRef(null);
    const [mapboxLoaded, setMapboxLoaded] = useState(false);

    const checkMapBox = useCallback(() => {
        if (typeof window === 'undefined') return;

        if (window.mapboxgl && window.MapboxGeocoder) {
            window.mapboxgl.accessToken =
                'pk.eyJ1IjoibWFoeWFyYXphZCIsImEiOiJjazhzaG9pNjIwYzJ4M2VyczJlNnNndzF6In0.ZFGc5daAFPaXObvBKA20CA';
            setMapboxLoaded(true);
        } else {
            setTimeout(checkMapBox, 100);
        }
    }, []);

    useEffect(() => {
        checkMapBox();
    }, [checkMapBox]);

    // Initialize the map - called when modal is fully opened and container is mounted
    const initMap = () => {
        if (!mapboxLoaded || !mapContainer.current) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const mapboxgl = window.mapboxgl;

        let centerLng = 25.194519;
        let centerLat = 55.2709;

        try {
            const parts = values.event_location.split(", ");
            centerLng = parseFloat(parts[1]);
            centerLat = parseFloat(parts[0]);
        } catch (error) {
            // fallback coords already set
        }

        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [centerLng, centerLat],
            zoom: 11,
        });

        mapRef.current.addControl(
            new window.MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                useBrowserFocus: true,
                mapboxgl: mapboxgl,
            })
        );

        markerRef.current = new mapboxgl.Marker({ color: "#FF0000" })
            .setLngLat([centerLng, centerLat])
            .addTo(mapRef.current);

        mapRef.current.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            

            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
                markerRef.current = new mapboxgl.Marker({ color: "#FF0000" })
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current);
            }

            onSelect({ lat, lng });
        });
    };

    // Cleanup map on modal close or unmount
    useEffect(() => {
        if (!isOpen) {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            title="Select Event Location"
            onAfterOpen={initMap} // <-- run after modal fully opens and content mounted
            onRequestClose={onClose}
        >
            <h4 className="small mb-3" >
                Click on the map to set a location, and make sure the red pin appears on your screen.
            </h4>
            <div style={{ height: '500px' }} ref={mapContainer} />
        </Modal>
    );
};

export default MapModal;

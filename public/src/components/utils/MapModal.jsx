import React, { useRef, useEffect, useState , useCallback} from 'react';
import Modal from '../Modal';
// import 'mapbox-gl/dist/mapbox-gl.css';

// Removed unused imports: jwtDecode, Cookies

const MapModal = ({ isOpen, onClose, onSelect, isParentModalOpen, values}) => {

    const mapContainer = useRef();
    const markerRef = useRef();
    const mapRef = useRef();
    const [mapboxLoaded, setMapboxLoaded] = useState(false);

    // Wait for mapboxgl to be available globally (loaded from CDN)
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
        if (!isOpen || !mapboxLoaded) return;
        
        const mapboxgl = window.mapboxgl;

        let centerLng;
        let centerLat;
        try{

            const parts = values.event_location.split(", ");
            centerLng =  parts[1];
            centerLat = parts[0];
        }catch(error){
            centerLng =  25.194519,
            centerLat =  55.270900

        }
        


        mapRef.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [centerLng, centerLat],
            zoom: 11,
        });

        
        mapRef.current.addControl(
            new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                useBrowserFocus: true,
                mapboxgl: mapboxgl
            })
        );

        
        markerRef.current = new mapboxgl.Marker({color: "#FF0000"})
                .setLngLat([centerLng, centerLat])
                .addTo(mapRef.current);

        mapRef.current.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            console.log('Map clicked at:', lng, lat);

            

            if (markerRef.current) {
                markerRef.current.setLngLat([lng, lat]);
            } else {
            markerRef.current = new mapboxgl.Marker({color: "#FF0000"})
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
            }

            onSelect({ lat, lng });
        });


      return () => mapRef.current.remove();

        
    }, [checkMapBox, isOpen]);




    useEffect(() => {

        if (!isParentModalOpen) {
            
            onClose();
        }
    }, [isParentModalOpen, onClose]);

    return (
        <>
            {isParentModalOpen && (
                <Modal isOpen={isOpen} onRequestClose={onClose} title="Select Event Location"  >
                    <h4 className="text-muted small mb-2">Click on the map to set a location, and make sure the red pin appears on your screen.</h4>
                    <div style={{ height: '500px' }} ref={mapContainer} />

                </Modal>
            )}
        </>
    );
};

export default MapModal;

import React, { useRef, useEffect, useState } from 'react';
import Modal from '../Modal';
// import 'mapbox-gl/dist/mapbox-gl.css';

// Removed unused imports: jwtDecode, Cookies

const MapModal = ({ isOpen, onClose, onSelect, isParentModalOpen, initialLon, initialLat }) => {
  const mapContainer = useRef(null);
  const markerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Wait for mapboxgl to be available globally (loaded from CDN)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMapbox = () => {
      if (window.mapboxgl) {
        window.mapboxgl.accessToken = "pk.eyJ1IjoibWFoeWFyYXphZCIsImEiOiJjazhzaG9pNjIwYzJ4M2VyczJlNnNndzF6In0.ZFGc5daAFPaXObvBKA20CA";
        setMapboxLoaded(true);
      } else {
        setTimeout(checkMapbox, 100);
      }
    };

    checkMapbox();
  }, []);

  useEffect(() => {
    if (!isOpen || !mapboxLoaded) return;

    const mapboxgl = window.mapboxgl;

    const centerLng = initialLon ?? 55.2708;
    const centerLat = initialLat ?? 25.2048;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [centerLng, centerLat],
      zoom: 11,
    });

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (initialLon != null && initialLat != null) {
      markerRef.current = new mapboxgl.Marker().setLngLat([initialLon, initialLat]).addTo(mapRef.current);
    }

    mapRef.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapRef.current);
      }

      onSelect({ lat, lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, mapboxLoaded, initialLon, initialLat, onSelect]);

  useEffect(() => {
    if (!isParentModalOpen) {
      onClose();
    }
  }, [isParentModalOpen, onClose]);

  return (
    <>
      {isParentModalOpen && (
        <Modal isOpen={isOpen} onRequestClose={onClose} title="Select Event Location">
          <div style={{ height: '500px' }} ref={mapContainer} />
          <p className="text-muted small mt-2">Click on the map to set a location.</p>
        </Modal>
      )}
    </>
  );
};

export default MapModal;

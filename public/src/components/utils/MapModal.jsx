// components/MapModal.jsx
import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import Modal from '../Modal'; 
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_APP_MAPBOX_TOKEN;

const MapModal = ({ isOpen, onClose, onSelect, isParentModalOpen, initialLon , initialLat }) => {
  const mapContainer = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const centerLng = initialLon ?? 55.2708;
    const centerLat = initialLat ?? 25.2048;

    debugger;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [55.2708, 25.2048], // Default to Dubai
      zoom: 10,
    });

    // If initial coordinates exist, add marker at that position
    if (initialLon != null && initialLat != null) {
        markerRef.current = new mapboxgl.Marker().setLngLat([initialLon, initialLat]).addTo(map);
    }

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
      }

      onSelect({ lat, lng });
    });

    return () => map.remove();
  }, [isOpen]);

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

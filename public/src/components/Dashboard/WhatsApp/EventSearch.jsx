import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { getEvents } from "../../../features/eventSlice";

const EventSearch = ({ setContactList }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');

    const [eventId, setEventId] = useState();
    const events = useAppSelector(getEvents);
    const filteredList = events.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())

    );

    const handleSelect = (x) => {
        fetchGuestList(x.id);
        setSelectedItem(x.id);
    }


    const handleSearch = (selectedEvent) => {
        if (!selectedEvent) {
            onFilter(contactList); // reset to full list
            return;
        }

        const filtered = contactList.filter(
            (contact) => contact.eventId === selectedEvent.id // adjust to your data shape
        );
        onFilter(filtered);
    };


    const fetchGuestList = async (eventId) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts?guest_list=1&event_id=${eventId}`,
                { credentials: "include" }
            );

            const responseData = await response.json();
            if (!response.ok) {
                console.error(responseData.error);
                return;
            }

            setContactList(responseData.data ?? []);

        } catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    };



    return (
        <div style={{ height: '85dvh' }}>
            <div className='rounded border p-2'>
                {/* Search box */}
                <input
                    type="text"
                    className="form-control mb-1 shadow-sm"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        transition: 'all 0.2s ease-in-out',

                        maxWidth: '250px'
                    }}
                />

                {/* List */}
                <div style={{ overflow: 'scroll', height: 'calc(85dvh - 60px)' }}>

                    <ul className="list-unstyled p-0 m-0 list-group" >
                        {filteredList.length > 0 ? (
                            filteredList.map((k) => (
                                <li
                                    onClick={() => handleSelect(k)}
                                    title={k.title}
                                    key={k.page}
                                    className={`p-1 mb-1 mt-1 rounded list-group-item ${selectedItem === k.id ? "active" : ""} hover-li`}
                                    style={{
                                        transition: 'all 0.2s ease-in-out',
                                        cursor: 'pointer',
                                        maxWidth: '250px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14,
                                            backgroundColor: selectedItem === k.id ? '#0d6efd' : '',
        color: selectedItem === k.id ? '#fff' : '#212529',
                                    }}
                                >
                                    {k.title}
                                </li>
                            ))
                        ) : (
                            <li className="text-muted fst-italic ">No matches found</li>
                        )}
                    </ul>
                </div>
            </div>


        </div>
    );
};

export default EventSearch;

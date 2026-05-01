import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { getEvents, setSelectedEvent, getShouldRefetchGuestList, clearRefetchGuestList, getSelectedEvent, setSelectedGuestList } from "../../../features/eventSlice";
import { Box } from '@mui/material'
const EventSearch = () => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const dispatch = useAppDispatch();

    const shouldRefetch = useAppSelector(getShouldRefetchGuestList);
    const eventId = useAppSelector(getSelectedEvent);



    const events = useAppSelector(getEvents);
    const filteredList = events.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())

    );




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


    const fetchGuestList = async (id) => {  // 👈 accept id as param
        try {
            setLoading(true);
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts?guest_list=1&event_id=${id}`,
                { credentials: "include" }
            );

            const responseData = await response.json();
            if (!response.ok) {
                console.error(responseData.error);
                return;
            }

            dispatch(setSelectedGuestList(responseData.data ?? []));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            dispatch(clearRefetchGuestList());
        }
    };

    const handleSelect = (x) => {
        setSelectedItem(x.id);              // 👈 you were never setting this — fixes highlight
        dispatch(setSelectedEvent(x));
        fetchGuestList(x.id);               // 👈 pass id directly, don't rely on selector
    };

    useEffect(() => {
        if (shouldRefetch && eventId?.id) {
            fetchGuestList(eventId.id);     // 👈 use the selector value here since this is a refetch
        }
    }, [shouldRefetch]);





    return (
        <Box sx={{
            flex: 1,
            minWidth: 0,
            height: { xs: '20dvh', md: '85dvh' },  // 👈 shorter on mobile
            width: { xs: '100%', md: 'auto' },      // 👈 full width on mobile
        }}>
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
                <Box sx={{
                    overflow: 'scroll',
                    height: { xs: 'calc(20dvh - 60px)', md: 'calc(85dvh - 60px)' } // 👈 matches parent height
                }}>

                    <ul className="list-unstyled p-0 m-0 list-group" >
                        {filteredList.length > 0 ? (
                            filteredList.map((k) => (
                                <li id={k.id}
                                    onClick={() => handleSelect(k)}
                                    title={k.title}
                                    key={k.id}
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
                </Box>
            </div>


        </Box>
    );
};

export default EventSearch;

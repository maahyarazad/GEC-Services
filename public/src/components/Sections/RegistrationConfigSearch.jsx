import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';

const RegistrationConfigSearch = ({ onSelect }) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [registrationConfigList, setRegistrationConfigList] = useState([]);

    const filteredList = registrationConfigList.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())


    );



    const handleSelect = (k) => {
        setSelectedItem(k.page);
        onSelect(k.page);
    }

    const fetchConfigData = useCallback(async () => {

        try {

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/registration-config-list`, { credentials: "include" });
            const response_data = await response.json();

            setRegistrationConfigList(response_data.rows);



        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    }, [])

    useEffect(() => {

        fetchConfigData();
    }, []);

    return (
        <Box sx={{
            width: '100%',
            height: { xs: 'auto', md: '85dvh' },
        }}>
            <div className='rounded border p-2'>
                {/* Search box */}
                <input
                    type="text"
                    className="form-control mb-1 shadow-sm"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ transition: 'all 0.2s ease-in-out' }} // removed maxWidth so it fills the panel
                />

                <Box sx={{
                    overflowY: 'auto',
                    height: { xs: '200px', md: 'calc(85dvh - 95px)' }, // fixed height on mobile so it scrolls
                }}>
                    <ul className="list-unstyled p-0 m-0 list-group">
                        {filteredList.length > 0 ? (
                            filteredList.map((k) => (
                                <li
                                    id={k.id}
                                    onClick={() => handleSelect(k)}
                                    title={k.title}
                                    key={k.id}
                                    className={`p-1 mb-1 mt-1 rounded list-group-item ${selectedItem === k.page ? "active" : ""} hover-li`}
                                    style={{
                                        transition: 'all 0.2s ease-in-out',
                                        cursor: 'pointer',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14,
                                        backgroundColor: selectedItem === k.page ? '#0d6efd' : '',
                                        color: selectedItem === k.page ? '#fff' : '#212529',
                                    }}
                                >
                                    {k.title}
                                </li>
                            ))
                        ) : (
                            <li className="text-muted fst-italic">No matches found</li>
                        )}
                    </ul>
                </Box>
            </div>
        </Box>
    );
};

export default RegistrationConfigSearch;

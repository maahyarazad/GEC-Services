import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { getEvents, setSelectedEvent, getGuestListRefetchNonce, getSelectedEvent, setSelectedGuestList, setGuestListLoading } from "../../../features/eventSlice";
import { Box } from '@mui/material'
import PropTypes from 'prop-types';
// `containerHeight` / `listHeight` default to the inline-layout values, so rendering
// with no props is byte-for-byte what it was before these props existed. They are
// overridden only when this component is rendered inside the mobile selection modal,
// where the inline heights (tuned to a 20dvh strip) are far too short.
//
// `onSelected` lets a host close itself after a pick. It fires *after* the existing
// dispatch + fetch, and deliberately does not wrap or replace either.
const EventSearch = ({
    containerHeight = { xs: '20dvh', md: '85dvh' },
    listHeight = { xs: 'calc(20dvh - 60px)', md: 'calc(85dvh - 60px)' },
    onSelected,
} = {}) => {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const dispatch = useAppDispatch();

    const refetchNonce = useAppSelector(getGuestListRefetchNonce);
    const eventId = useAppSelector(getSelectedEvent);

    // Always hold the latest selected event so the nonce-driven refetch below
    // targets the current event without having to list `eventId` as a dependency
    // (which would cause an extra refetch on every event switch).
    const eventIdRef = useRef(eventId);
    useEffect(() => { eventIdRef.current = eventId; }, [eventId]);

    const events = useAppSelector(getEvents);

    // Filtered list is recomputed only when the events or search term change.
    const filteredList = useMemo(
        () => events.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase())),
        [events, searchTerm]
    );

    // Holds the in-flight request so we can cancel a superseded fetch or one
    // still running when the component unmounts (prevents setState-after-unmount).
    const abortRef = useRef(null);

    const fetchGuestList = useCallback(async (id) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            setLoading(true);
            // Shared flag so GuestListPanel can unmount its grid and show a
            // loading indicator while the new event's guest list is fetched.
            dispatch(setGuestListLoading(true));
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts?guest_list=1&event_id=${id}`,
                { credentials: "include", signal: controller.signal }
            );

            const responseData = await response.json();
            if (!response.ok) {
                console.error(responseData.error);
                return;
            }

            dispatch(setSelectedGuestList(responseData.data ?? []));
        } catch (error) {
            if (error.name !== 'AbortError') console.error(error);
        } finally {
            // Skip state updates if this request was aborted (unmounted/superseded).
            if (!controller.signal.aborted) {
                setLoading(false);
                dispatch(setGuestListLoading(false));
            }
        }
    }, [dispatch]);

    // Abort any pending request on unmount.
    //
    // If a request really was in flight, also clear the shared loading flag. The
    // aborted request's own `finally` deliberately skips that (it is guarded by
    // `!controller.signal.aborted`), which is correct when a *newer* fetch has
    // superseded it — that fetch immediately sets the flag true again. It is wrong
    // on unmount, where nothing is left to clear it and GuestListPanel would render
    // its spinner forever.
    useEffect(() => () => {
        const controller = abortRef.current;
        if (controller && !controller.signal.aborted) {
            controller.abort();
            dispatch(setGuestListLoading(false));
        }
    }, [dispatch]);

    const handleSelect = useCallback((x) => {
        setSelectedItem(x.id);
        dispatch(setSelectedEvent(x));
        fetchGuestList(x.id);
        onSelected?.();
    }, [dispatch, fetchGuestList, onSelected]);

    // Re-fetch the guest list whenever a refetch is requested. The nonce changes
    // on every `triggerRefetchGuestList()` dispatch — including back-to-back
    // requests — so refreshes are never coalesced or dropped. (nonce starts at 0,
    // so no fetch fires on the initial mount.)
    useEffect(() => {
        if (refetchNonce > 0 && eventIdRef.current?.id) {
            fetchGuestList(eventIdRef.current.id);
        }
    }, [refetchNonce, fetchGuestList]);





    return (
        <Box sx={{
            flex: 1,
            minWidth: 0,
            height: containerHeight,  // 👈 shorter on mobile; overridden inside the modal
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
                    height: listHeight // 👈 matches parent height
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

EventSearch.propTypes = {
    // Height of the component's outer Box. Defaults to the inline-layout value.
    containerHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    // Height of the scrollable event list. Defaults to the inline-layout value.
    listHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    // Fired after an event is selected, so a host modal can close itself.
    onSelected: PropTypes.func,
};

export default EventSearch;

import { useState, useRef, useEffect } from "react";
import HoverItem from '../HoverItem';
function EventDropdownSearch({ events = [], eventId, onSelect }) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    const selectedEvent = events.find((e) => String(e.id) === String(eventId));

    const filtered = events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSelect(event) {
        onSelect("eventId", String(event.id));
        setSearch("");
        setOpen(false);
    }

    return (
        <div className="" ref={wrapperRef}>
            <label className="form-label">Select Event:</label>

            <div style={{ position: "relative" }}>
                {/* Trigger button — shows selected event or placeholder */}
                <div
                    className="form-select"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setOpen((prev) => !prev)}
                >
                    {selectedEvent ? selectedEvent.title : "— Choose an event —"}
                </div>

                {/* Dropdown panel */}
                {open && (
                    <div
                        className="border rounded shadow-sm bg-white"
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            maxHeight: 260,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Search input */}
                        <div className="p-2 border-bottom">
                            <input
                                autoFocus
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Search events..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Results list */}
                        <ul
                            className="list-unstyled mb-0"
                            style={{ overflowY: "auto", maxHeight: 200 }}
                        >
                            {filtered.length > 0 ? (
                                filtered.map((e) => {
                                    const isSelected = String(e.id) === String(eventId);
                                    return (
                                        <HoverItem
                                            key={e.id}
                                            isSelected={isSelected}
                                            onClick={() => handleSelect(e)}
                                        >
                                            {e.title}
                                        </HoverItem>
                                    );
                                })
                            ) : (
                                <li className="px-3 py-2 text-muted">No events found</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EventDropdownSearch;
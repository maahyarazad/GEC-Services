# Feature Ticket Part 1: Responsive Admin Panel

## Description

The title displayed in `MessageModal.jsx` should support text truncation when the content is too long.

### Requirements

* Apply text ellipsis (`...`) when the title exceeds the available width.
* Prevent the title from overflowing or breaking the modal layout.
* Ensure the title remains responsive across different screen sizes.
* Display the full title on hover using a tooltip, if applicable.

### Expected Behavior

**Before**

```txt
This is a very long message title that extends beyond the modal header and breaks the layout...
```

The title may overflow or affect the modal's appearance.

**After**

```txt
This is a very long message title that excee...
```

The title should remain within the available space and display an ellipsis when truncated.


# Feature Ticket Part 2: Mobile Modal Enhancements

## Description 

The Modal should also take the entire height

```js
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
```

# Feature Ticket Part 3: Fix Chat View Height

## Description 

Please make this height assignment fix in both  mobile and desktop the contact_name gets 5% and the ChatView gets 85% and and the button takes 10% of the height

```jsx
   <form onSubmit={handleSubmit}>
            <div className="container pt-2">
                <div className="container pt-2 d-flex align-items-center gap-2" style={{ height: '5dvh' }}>
                    <div className="avatar-circle">
                        {contact_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="contact-name">{contact_name}</span>
                </div>

                <div className="py-2 d-flex justify-content-start align-items-center" style={{ height: '85dvh' }}>
                    <ChatView messages={history} loadingHistory={loadingHistory} />
                </div>

                <div style={{ height: '10dvh' }}>

                    <div className="row">
                        <div className="col mb-3">
                            <label>Your Message:</label>
                            <textarea
                                rows={2}
                                name="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="form-control"
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-12">
                            <Button
                                variant="contained"
                                color="primary"
                                type="submit"
                                disabled={loading}
                                sx={{ textTransform: 'none', width: '100%' }}
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                            >
                                {loading ? "Sending..." : "Send"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
```



# Feature Ticket Part 4: WhatsApp Section Mobile View Update and UI Fixes

## Description

### 1. Mobile View – Twilio Template Section

In mobile view:

* Hide the **Twilio Template CustomDataGrid**.
* Display only the **id="action-tab"**, which contains the ActiveEventCard and buttons that handle handleSetOpenPanel
* Add a new button at the buttom of **id="action-tab"** that allows users to open and view the 
```jsx
   {/* ── Main content area ── */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {groupedByTypeKey && <TwilioTemplateDataGrid groupedByTypeKey={groupedByTypeKey} messageState={messageState} handleMessageStateChange={handleMessageStateChange} />}
                    {twilioCreditLow && <TwilioCreditWarning twilioCreditLow={twilioCreditLow} twilioCreditLowMessage={twilioCreditLowMessage} />}
                </Box>
```
 when needed.

In desktop view:

* No changes are required.
* The current layout and behavior should remain unchanged.

### 2. GuestListPanel DataGrid Migration

Replace the existing **DataGrid** with the reusable **CustomDataGrid** component.

### 3. CustomDataGrid Filter State Preservation

In the generic **CustomDataGrid** component:

* When a column filter is opened and a value has been entered into the filter input, the value should remain preserved.
* Currently, changing the selected column clears the filter input value.
* Update the behavior so that the filter input state is retained and does not get cleared unexpectedly when switching between columns or reopening the filter.

### 4. Reduce the Modal Padding in Mobile View

reduce the padding to 0.5rem
```css
.modal-content{
    padding: 1rem;
}
```


# Feature Ticket Part 5: Fix QuickReply and ChatView Height Allocation

## Description

The modal header currently occupies approximately **5% of the total viewport height**.

### Desktop View

Update the layout so that:

* The **QuickReply** section always has a fixed height of **80% of the viewport height (80vh)**.
* The **ChatView** section should occupy **80% of the available height within the QuickReply component**.
* The remaining space within QuickReply can be used for the input area, controls, or other UI elements.

### Mobile View

Update the layout so that:

* The modal opens in **full-screen mode**, consistent with other mobile modals in the application.
* The **QuickReply** section should occupy **85% of the total viewport height (85vh)**.
* The remaining height should be allocated to the modal header and any required footer or action controls.

## Expected Result

* The QuickReply and ChatView areas should maintain consistent sizing across different screen sizes.
* Scrolling should occur within the content areas rather than causing the entire modal layout to shift.
* The layout should remain stable and responsive in both desktop and mobile views.

# Feature Ticket Part 5: Fix QuickReply and ChatView html structure


## Description

Change the entire html structre and the text area and send button and the ChatView should take the entire width

```jsx
 <form
            onSubmit={handleSubmit}
            style={{
                height: isMobile ? '85vh' : '80vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ChatView — 80% of form height */}
            <div style={{ height: '80%', display: 'flex', alignItems: 'stretch' }}>
                <ChatView messages={history} loadingHistory={loadingHistory} />
            </div>

            {/* Input area — remaining 20% */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem 0' }}>
                <div className="row">
                    <div className="col mb-2">
                        <label>Your Message:</label>
                        <textarea
                            rows={2}
                            name="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="form-control"
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="col-12">
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            disabled={loading}
                            sx={{ textTransform: 'none', width: '100%' }}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? "Sending..." : "Send"}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
```



# Feature Ticket Part 6: WhatsApp Section Mobile UI Improvement

## Description


In mobile view:

* The **id="action-tab"**, which contains the ActiveEventCard and buttons. the buttons are small in mobile view meaning thier hieght is not same as the other action buttns 
please increase the size in mobile view


# Feature Ticket Part 6: Ultimate User Experience Update for Response Logs

## Description

In the `WhatsApp.jsx` component, customize the `CustomDataGrid` and `responseColumns` specifically for the **Response Logs** view on mobile devices.

Instead of displaying records as cards, render them using a layout similar to the WhatsApp application UI, providing a more familiar and user-friendly mobile experience.

### Requirements

* Apply the customization **only** to the **Response Logs** section and **only** in mobile view.
* On mobile view, display response log entries using a WhatsApp-style conversation list layout.
* The **Notepad** feature should **not** be displayed by default.
* The **Notepad** should open only when the user performs a **press-and-hold (long press)** action on a response item.

```jsx
{openPanel === 'response-logs' && (
    <div style={{ width: '100%', height: 'calc(100vh - 105px)' }}>
        <CustomDataGrid
            rows={responses}
            columns={responseColumns({
                onViewJson,
                onViewHistory,
                activeMemberPhones: activeMemberPhonesResponses,
                onOpenNotepad: handleOpenNotepadByPhone,
                notes: responseNotes
            })}
            loading={loading_logs}
            showToolbar

            filterMode="server"
            sortingMode="server"
            paginationMode="server"

            rowCount={responsesRowCount}
            paginationModel={responsesPaginationModel}
            onPaginationModelChange={setResponsesPaginationModel}
            rowsPerPageOptions={[25, 50, 100]}

            sortModel={responsesSortModel}
            onSortModelChange={setResponsesSortModel}

            filterItems={responsesFilterItems}
            onFilterItemsChange={setResponsesFilterItems}

            disableRowSelectionOnClick
        />
    </div>
)}
```


# Feature Ticket Part 7: Fix ChatView Auto-Scroll and Enhance Response Logs Mobile Experience

## Part 1: Fix ChatView Auto-Scroll Behavior

### Description

`bottomRef` is currently used to automatically scroll to the latest message in the `ChatView` component.

Since the chat history may contain messages from many different users, update the implementation so that the view scrolls directly to the most recent message whenever the message data has finished loading.

Remove the existing `bottomRef` implementation and the following auto-scroll logic:

```jsx
const bottomRef = useRef(null);

useEffect(() => {
    if (!loadingHistory && messages?.length) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
}, [messages, loadingHistory]);
```

### Requirements

* Remove the `bottomRef` implementation.
* Automatically position the chat view at the latest message after the message history has loaded.
* Ensure the latest message is visible immediately without relying on `scrollIntoView`.
* The solution should work reliably regardless of the number of messages loaded.

---

## Part 2: Enhance Response Logs Mobile Experience

### Description

The `CustomDataGrid` from the previous feature has been redesigned with a WhatsApp-style mobile interface.

Add a search bar to the top of the Response Logs view so users can quickly search and filter conversations by name.

### Requirements

* Apply this customization **only** to the **Response Logs** section.
* Apply this customization **only** in **mobile view**.
* Add a search input above the conversation list.
* Allow users to search and filter conversations by contact name.
* Update the displayed results dynamically as the user types.
* Maintain the existing WhatsApp-style mobile UI introduced in the previous feature.


# Feature Ticket Part 8: Enhance Response Logs Mobile Experience — Server-Side Conversation Search

## Description

The current conversation search functionality in the Response Logs mobile view is implemented on the client side.

Update the search functionality to use server-side filtering instead. To reduce unnecessary API requests and improve performance, implement a long debounce interval before triggering the search request.

## Requirements

* Apply this enhancement **only** to the **Response Logs** section.
* Apply this enhancement **only** in **mobile view**.
* Replace the existing client-side search with server-side search.
* Add a long debounce delay before sending search requests to the server.
* Trigger the search request only after the user has stopped typing for the configured debounce period.
* Search conversations by contact name.
* Preserve the existing WhatsApp-style mobile UI.
* Ensure pagination, filtering, and search results remain synchronized with the server response.
* Prevent excessive API requests while the user is typing.


# Feature Ticket Part 9: Enhance WhatsApp Section Mobile View UI

## Description

Increase the size of the buttons inside the `action-tab` section of the WhatsApp page by **25%** when displayed on mobile devices.

This enhancement should improve touch accessibility and provide a better user experience on smaller screens.

```jsx id="mw8k2p"
{/* ── Vertical action sidebar ── */}
<Box
    id="action-tab"
    sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
        minWidth: 44,
        flexShrink: 0,
        marginBottom: {
            xs: '5px',
            md: 'none',
        },
        maxHeight: {
            xs: '88dvh',
            md: '100dvh',
        },
        overflowY: 'scroll',
        '& .MuiButton-root': {
            minHeight: { xs: 44, sm: 'unset' },
            fontSize: { xs: '0.8rem', sm: 'inherit' },
        },
    }}
>
```

## Requirements

* Apply this enhancement **only** to the **WhatsApp** section.
* Apply this enhancement **only** in **mobile view**.
* Increase the size of all buttons inside the `action-tab` container by approximately **25%**.
* Scale button dimensions proportionally to maintain a consistent appearance.
* Preserve the existing desktop and tablet layouts.
* Improve touch-target accessibility without affecting functionality.

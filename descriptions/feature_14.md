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
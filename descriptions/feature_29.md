# Feature 29 – Improve Guest List Panel
## Description


1. There is a `dispatch(triggerRefetchGuestList());` dispatch call that refetch the GuestList so in the `GuestRegistration.jsx` so in the below code I need to trigger it on the successful post request 

```jsx
 const fetchRegistration = useCallback(async () => {
        setLoading(true);
        if (!query) {
            setError("No guest-code provided in URL.");
            setLoading(false);
            return;
        }

        if (!guestUser) return;

        try {

            const formData = new FormData();
            formData.append("event_id", query);

            const response = await fetch(`${import.meta.env.VITE_SERVERURL}/complete-registration`, {
                method: 'POST',
                body: formData,
            });
            
            const response_data = await response.json();
            setRegistrant(response_data.record);
            setPageMessage(response_data.message);
            setStatusCode(response.status);

            
            if (response.status === 200) {
                
                showSnackbar(response_data.message, 'success');
                return;
            }

            showSnackbar(response_data.message, "");


        } catch (err) {
            
            showSnackbar(err.message, "");
            setError("Failed to fetch registration.");
        } finally {
            setLoading(false);
        }
    }, [query, guestUser]);
```
Syliva is the organizer, she doesn’t want to ask Jan to pay 100 200 to hire a hostess for an hour, so, she goes around find a vunerable person and put this stupid wwok on someone

## Frontend Optimization

### Description

Review all `.jsx` and `.tsx` files and identify components that can fit frombene `React.memo`. Wrap appropriate components with `React.memo` to reduce unnecessary re-renders and improve overall frontend performance.

Example:

```jsx
const UserCard = React.memo(function UserCard({ user }) {
  console.log("Rendering UserCard");

  return <div>{user.name}</div>;
});
```

Only apply `React.memo` where it provides a measurable benefit. Avoid wrapping components that:
- Frequently receive new object, array, or function props.
- Are inexpensive to render.
- Do not benefit from memoization due to their usage patterns.

Also review the use of `useMemo` and `useCallback` where stable references are needed to maximize the effectiveness of `React.memo`.





# Feature 29 – Improve Guest List Panel
## Description


1. There is a `dispatch(triggerRefetchGuestList());` dispatch call that refetch the GuestList so in the `GuestRegistration.jsx` so in the below code I need to trigger it in `EventSpeedDial.tsx` where `handleAddToGuestList` execute

```jsx
  const handleAddToGuestList = async (contactId: any, eventId: any) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SERVERURL}/api/contacts/add-to-guest-list?contactId=${contactId}&eventId=${eventId}`,
                { credentials: "include" }
            );
            if (response.status === 200) {
                setSuccessEventId(eventId);
                if (successTimer.current) clearTimeout(successTimer.current); // clear any existing
                successTimer.current = setTimeout(() => setSuccessEventId(undefined), 3000);
            } else {
                setFailedEventId(eventId)
                if (failTimer.current) clearTimeout(failTimer.current); // clear any existing
                failTimer.current = setTimeout(() => setFailedEventId(undefined), 3000);
            }
        } catch (err) {
            console.error('Failed to fetch:', err);
        }
    };
```

2. Optomize the `EventSpeedDial.tsx` component using useCallback and useMemo where provides a measurable benefit




## 3. Enhance – eventSlice.ts

### Description

1. Review `eventSlice.ts`, including slices and selectors, and refactor the store to use WebSocket-based updates. Update all related components that use these selectors and slices.


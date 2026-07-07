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

## Frontend Optimization

### Description

Review all `.jsx` and `.tsx` files and identify components that can benefit from `React.memo`. Wrap appropriate components with `React.memo` to reduce unnecessary re-renders and improve overall frontend performance.

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
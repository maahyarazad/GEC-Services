# Feature 26.1: Improve Event Registration Login

## Part 1

### Description

In **`EventRegistration.jsx`**, improve the size of the login button and input fields in the mobile view. Increase their dimensions to match the standard sizing commonly used in Google's mobile UI for better usability and accessibility.

## Part 2

### Description
In **`EventRegistration.jsx`**, improve the login section and the below part like **`Login.jsx`**,
```jsx
    <div className="d-flex align-items-center mb-3">
                    <img alt="GEC Logo" src={GECLogo} height={50} style={{ borderRadius: 6 }} />
                    <div className="d-flex flex-column ps-3" style={{ fontWeight: 300 }}>
                        <div>GEC Services</div>
                        <div style={{ fontSize: 10, color: "#6b6347" }}>Member Portal</div>
                    </div>
                </div>
```
## Part 3

### Description

In **`EventRegistration.jsx`**, after the user logs in, fetch the event details from the server using the event ID. Replace the static **`Event Registration`** title with the actual event title returned by the server.



# Feature 26.2: Improve Login 
## Part 1

### Description

In **`Login.jsx`**, improve the size of the login button and input fields in the mobile view. Increase their dimensions to match the standard sizing commonly used in Google's mobile UI for better usability and accessibility.

## Part 2

### Description

In **`Login.jsx`**, add a link next to the **Member Portal** that navigates to the **Admin Portal**. Likewise, add a link next to the **Admin Portal** that navigates back to the **Member Portal**.


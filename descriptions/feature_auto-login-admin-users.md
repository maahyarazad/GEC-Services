# Feature Ticket 20: Auto Login Admin Users

## Description


When a request contains the required admin authentication parameters, the application should send a request to the server to validate the provided token using `GEC_SECRET`.

If the token is valid:

1. Generate an admin session for the specified user.

2. Store the user's email address in the authentication state.

3. Display the user's email address in the navigation bar.

4. Show a label such as:

   ```
   Logged in as: user@example.com
   ```

5. Grant administrator access to the application.

### Token Generation

The token is generated using the following PHP code:

```php
hash_hmac('sha256', validate($_user[0]->email), GEC_SECRET);
```

### Example URL

```txt
https://services.german-emirates-club.com/admin?email=development3%40german-emirates-club.com&token=833fd23305065c1137c1b8fd2aa7374af5a78ba34646e7e7150ce43a89dca209
```

### Validation Flow

1. Read the `email` and `token` query parameters.
2. Send them to the server for validation.
3. Verify the token against `GEC_SECRET`.
4. If validation succeeds, create an admin session and log in the user.
5. Display the user's email address in the navigation bar.
6. If validation fails, deny access and redirect the user to the login page.



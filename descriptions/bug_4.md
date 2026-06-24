# Bug: IMAP socket restarts server every 2 minutes 

## Target Files

- `imapPoller.js`
- `server.js`

## Description

I have two web sockets in this application and as I checked the server logs imapPoller restarts the server every two minutes which is absolutley ridiculuous 

### Requirements

1. Review all `console.log` and `console.error` statements in the server-side files.
2. Update all log statements to use the new timestamp format:

```javascript
console.error(`${Date.now()} - Error in /api/validate-number:`, error);
```

3. Ensure that every log entry includes a dynamically generated timestamp at the time the log is written.
4. Update the timestamp parsing and display logic in `ServerLogs.jsx` to support the new timestamp format.
5. Verify that the server log viewer correctly displays the actual event time for each log entry.
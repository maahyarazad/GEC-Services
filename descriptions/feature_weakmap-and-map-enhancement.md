# Feature 31 – WeakMap and Map Enhancement

## Description

1. Add a PWA installation prompt to the application using the `beforeinstallprompt` event from the MDN documentation:
   https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt

2. The install prompt should be available across all routes in the application.

3. Implement the following logic:
   - Capture the `beforeinstallprompt` event and prevent the default browser prompt.
   - Store the install prompt event and trigger it when the user selects the install option.
   - Hide the install option after the prompt is completed.
   - Check `navigator.getInstalledRelatedApps()` to detect whether the application is already installed and update the UI accordingly.


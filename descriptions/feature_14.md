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

All modal components should display in **full-screen mode** on mobile devices to provide a better user experience and improve usability on smaller screens.

## Expected Behavior

### Desktop

* Modals should continue to display using their current width and height settings.

### Mobile

* Modals should occupy the full viewport width and height.
* Content should be optimized for touch interaction.

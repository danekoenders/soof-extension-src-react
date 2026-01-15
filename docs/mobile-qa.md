# Mobile widget QA checklist

Use this checklist when testing the mobile widget experience across browsers.

## Devices / browsers
- iOS Safari
- iOS Chrome
- Android Chrome
- Android Firefox
- Samsung Internet (if available)

## Viewport & keyboard behavior
- Open widget and confirm it fills the visible viewport without gaps.
- Focus the input and verify the keyboard animation does **not** cause jumps or resizing glitches.
- Ensure the input stays visible above the keyboard.
- Close the keyboard and confirm the layout returns smoothly.

## Scrolling behavior
- Scroll the messages list to the top and bottom.
- Confirm the page behind the widget does **not** scroll (no scroll chaining).
- Verify that scrolling works inside the messages list and sources carousel.

## Safe-area & UI chrome
- Confirm safe-area padding is respected (notch, home indicator).
- Rotate the device and verify the widget recalculates the viewport height correctly.

## Current Implementation Status

AxioGraph is a browser-based digital millimeter-paper tool designed for plotting and analysing experimental data.

### Core Features

* A4-style millimeter grid with OX and OY axes.
* Custom axis labels, scales and spacing values.
* A **Set** action applies both axis scales together.
* Experimental points with coordinate guides and axis markers.
* Two independent draggable trendlines.
* Manual extension lines for both trendlines.
* Axis-intersection markers for both lines.
* Two pairs of slope points.
* Editable smooth curve line.
* Save and load complete work as `.axio` files.
* Graph Preview mode for viewing the final A4 layout.

Axis labels and ticks use a geometric collision system with the following priority:

1. Intercepts
2. Experimental points
3. Slope points
4. Scale-step values

When labels overlap, the most important value is kept. Distinct ticks may remain visible even when a lower-priority text label is hidden.

### Scale Changes

When the scale changes:

* experimental points, slope points and intercepts preserve their mathematical values and are repositioned automatically;
* the two main trendlines are remapped from the old scale to the new one;
* extension lines are reset and can be rebuilt manually;
* the old curve line is cleared because it no longer represents the same graphical relation.

### Detail View

Detail View is an axis-inspection tool, not a clone of the complete graph.

It displays:

* an enlarged local grid;
* the selected axis;
* the perpendicular axis and the origin when the inspected area is close to zero;
* axis ticks and values;
* visible trendlines and their extensions.

Point circles, guide lines and the curve are not copied into Detail View.

OX and OY are divided into three initial inspection areas. After opening Detail View, the visible source window can be dragged continuously along the selected axis.

The Detail View window remains aligned with the real axis while its content moves inside it. Grid-line visibility is increased without changing the original graph.

### Intentional Drag Behaviour

Dragging toward the right inspects values farther to the right; therefore, the graph content moves toward the left inside the fixed Detail View window. The same rule applies vertically.

This is intentional viewport-navigation behaviour, not a bug. It was preserved after practical testing because users naturally drag toward the area they want to inspect.

### Smooth Rendering and Pointer Safety

Detail View updates are synchronized with the display through `requestAnimationFrame`.

The final pointer position is rendered synchronously on `pointerup`, preventing the view from stopping on an older animation frame.

The interaction also handles:

* `pointerup`;
* `pointercancel`;
* `lostpointercapture`;
* cancellation of pending frames and drag state when Detail View is turned off.

The initial three-area selection is intentional. Comments and constants were updated to reflect this behaviour, and positioning adjustments use named constants instead of unexplained numeric values.

Detail View is hidden automatically when Graph Preview is opened.

### Mobile Support

The graph and control panel can be navigated independently on small screens. The A4 sheet preserves its proportions, the control panel remains scrollable, and browser zoom does not distort the layout.

Trendlines, extension handles and Detail View were tested directly on a mobile device and can be dragged fluently by touch.

Mobile hit targets use invisible SVG geometry:

* a transparent interaction band around draggable lines;
* invisible handle targets with radius `8`, without enlarging the visible handles.

### Mobile Pointer Debugging

The initial pointer engine worked correctly on desktop but mobile dragging stopped almost immediately.

A visual diagnostic was used:

* yellow — `pointerdown` received;
* pink — `pointercancel` received;
* green — `pointerup` received.

Testing showed that the browser interpreted the gesture as page scrolling and emitted `pointercancel` before the finger was lifted.

The working solution is a non-passive `touchstart` listener on the SVG. On mobile, it calls `preventDefault()` only when the touch starts on a draggable SVG target: a trendline band, a trendline handle, a curve handle, or a Detail View sensor.

This prevents browser scrolling from cancelling the pointer interaction, while ordinary navigation remains available elsewhere on the sheet. The existing pointer flow can then continue normally.

This solution preserves ordinary page navigation outside draggable graph elements. Applying `touch-action: none` to the entire SVG was intentionally avoided because it prevented normal movement across the sheet.

For trendlines and curve handles, pointer capture remains on the original SVG. Detail View uses pointer capture on the active axis sensor. The experimental capture system on `#a4-container` was unnecessary and was removed.

### Performance Note

The Detail View renderer currently rebuilds its SVG content during dragging. `requestAnimationFrame` keeps this fluid in practical desktop and mobile testing. Further renderer optimization should only be considered if profiling reveals performance problems on slower devices.

### Axis Origin and Final Visual Refinements

The axis origin can be selected before beginning a graph:

* **Mid** places OY at the centre of the grid;
* **Left** places OY one major square inside the left edge, leaving room for negative values and axis labels.

The selected origin updates coordinate conversion, axis labels, scale-step values and the OY Detail View sensor. It is saved as `originMode` in `.axio` files and restored automatically. Older files without this property default to **Mid**.

After an explicit origin choice, both origin buttons remain locked until the page is refreshed. If drawing has already started with a trendline or curve, a late origin change is rejected to prevent SVG geometry from becoming inconsistent. Loaded work files also restore the origin in its locked state.

Detail View can now be closed and deactivated by clicking or tapping anywhere on the SVG outside its displayed window. The existing OFF button remains available.

Normal View was visually refined for dense experimental datasets:

* axis values and Scale Steps use **Barlow Condensed**, size `3.4`, weight `700`;
* experimental points use radius `0.6`;
* experimental coordinate guides use stroke width `0.24`, dash pattern `1,1.8` and a muted transparent colour;
* experimental axis values use reduced opacity;
* special-value ticks and Scale Step ticks both use stroke width `0.25`.

Detail View intentionally preserves its original **Poppins** typography and high-contrast pink values. This is a deliberate distinction: Normal View reduces visual density, while Detail View prioritizes enlarged, high-contrast reading.

## Recent improvements — Axis Detail View and mobile usability

### Axis labels and visual hierarchy

* In Normal View, special values on the OY axis are displayed only on the left side to reduce visual clutter.
* In Axis Detail View, OY labels may use both sides of the axis. If the preferred position overlaps another label, the renderer attempts the opposite side.
* Label priority was corrected to:
  `Intercepts > Slope Points > Experimental Points > Steps`.
* Detail View duplicate detection now preserves the value with the highest priority. A slope value therefore replaces an experimental value when both represent the same coordinate.
* Experimental guide lines were changed from pink to blue and use a denser dash pattern so they remain visible over the blue graph-paper grid.
* Experimental and intercept values now use separate, less visually aggressive colors.
* Slope-point styling was improved with a stronger orange, a larger Barlow Condensed label and slightly increased letter spacing.

### Detail View typography

* Poppins is now explicitly loaded for Axis Detail View.
* Step and special-value text sizes were aligned.
* On screens up to 700 px wide, Detail View text is enlarged by 30%.
* Desktop text sizing remains unchanged.

### Persistent Detail View mode

Detail View now behaves as a persistent inspection mode:

* Activating Detail View enables the axis sensors.
* Tapping or clicking an axis opens the lens.
* Clicking outside the lens hides only the lens; it does not deactivate Detail View.
* Clicking an axis again immediately reopens the lens.
* The `OFF` button is the only control that completely disables Detail View.

On mobile:

* A tap in the upper half of the SVG may hide the lens.
* Touches and scrolling in the lower half do not close it.
* The user can keep the lens open while scrolling to the input fields and entering measured values.

This workflow makes it possible to inspect a graph location, enter an intercept or another measured value, and immediately return to the graph without repeatedly activating Detail View.

Tested successfully on both desktop and mobile.






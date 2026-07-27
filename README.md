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


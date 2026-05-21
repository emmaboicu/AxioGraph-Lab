// AxioGraph_4 — sheet.js
// Foaia milimetrică + coordonate SVG

export const x0 = 16;
export const y0 = 250;
export const gridWidth = 240;
export const gridHeight = 240;

export const originX = x0 + gridWidth / 2;

export const gridFineStroke = 0.05;
export const gridMediumStroke = 0.12;
export const gridMajorStroke = 0.2;

export const axisStroke = 0.7;
export const axisTickStroke = 0.28;
export const coordGuideStroke = 0.28;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clampPointToGrid(point) {
  return {
    x: clamp(point.x, x0, x0 + gridWidth),
    y: clamp(point.y, y0 - gridHeight, y0)
  };
}

export function snapPointToGrid(point) {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}

export function clampAndSnapPoint(point) {
  return snapPointToGrid(clampPointToGrid(point));
}

export function drawGrid() {
  const gridGroup = document.getElementById('grid-lines');
  gridGroup.innerHTML = '';

  for (let i = 0; i <= gridWidth; i++) {
    const x = x0 + i;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    line.setAttribute('x1', x);
    line.setAttribute('y1', y0 - gridHeight);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y0);
    line.setAttribute('stroke', '#4fc8fc');
    line.setAttribute(
      'stroke-width',
      i % 10 === 0 ? gridMajorStroke : (i % 5 === 0 ? gridMediumStroke : gridFineStroke)
    );

    gridGroup.appendChild(line);
  }

  for (let j = 0; j <= gridHeight; j++) {
    const y = y0 - j;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    line.setAttribute('x1', x0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x0 + gridWidth);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#4fc8fc');
    line.setAttribute(
      'stroke-width',
       j % 10 === 0 ? gridMajorStroke : (j % 5 === 0 ? gridMediumStroke : gridFineStroke)
    );

    gridGroup.appendChild(line);
  }
}

export function drawAxes() {
  const axesGroup = document.getElementById('axes');
  axesGroup.innerHTML = '';

  const originX = x0 + gridWidth / 2;

  const hAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const hCenterY = y0 + axisStroke / 2;

  hAxis.setAttribute('x1', x0);
  hAxis.setAttribute('y1', hCenterY);
  hAxis.setAttribute('x2', x0 + gridWidth);
  hAxis.setAttribute('y2', hCenterY);
  hAxis.setAttribute('stroke', '#00008B');
  hAxis.setAttribute('stroke-width', axisStroke);
  hAxis.setAttribute('marker-end', 'url(#arrow-head)');

  axesGroup.appendChild(hAxis);

  const vAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');

  vAxis.setAttribute('x1', originX);
  vAxis.setAttribute('y1', y0);
  vAxis.setAttribute('x2', originX);
  vAxis.setAttribute('y2', y0 - gridHeight);
  vAxis.setAttribute('stroke', '#00008B');
  vAxis.setAttribute('stroke-width', axisStroke);
  vAxis.setAttribute('marker-end', 'url(#arrow-head)');

  axesGroup.appendChild(vAxis);

  const originLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  originLabel.textContent = 'O';
  originLabel.setAttribute('x', originX);
  originLabel.setAttribute('y', y0 + 13);
  originLabel.setAttribute('text-anchor', 'middle');
  originLabel.setAttribute('font-size', '6');
  originLabel.setAttribute('font-family', 'Poppins, Arial, sans-serif');
  originLabel.setAttribute('font-weight', '700');
  originLabel.setAttribute('fill', '#00008B');

  axesGroup.appendChild(originLabel);
}

export function valueToGridX(value, scaleXValue) {
  const scaleValX = parseFloat(scaleXValue);

  if (isNaN(scaleValX) || scaleValX === 0 || isNaN(value)) return null;

  const originX = x0 + gridWidth / 2;
  const x = originX + Math.round((value / scaleValX) * 10);

  if (x < x0 || x > x0 + gridWidth) return null;

  return x;
}

export function valueToGridY(value, scaleYValue) {
  const scaleValY = parseFloat(scaleYValue);

  if (isNaN(scaleValY) || scaleValY === 0 || isNaN(value)) return null;

  const y = y0 - Math.round((value / scaleValY) * 10);

  if (y > y0 || y < y0 - gridHeight) return null;

  return y;
}

export function valuesToSvgPoint(valueX, valueY, scaleXValue, scaleYValue) {
  const x = valueToGridX(valueX, scaleXValue);
  const y = valueToGridY(valueY, scaleYValue);

  if (x === null || y === null) return null;

  return { x, y };
}

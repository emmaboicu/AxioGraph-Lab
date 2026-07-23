// AxioGraph — app.js

import {
  x0,
  y0,
  gridWidth,
  gridHeight,
  originX,
  axisStroke,
  axisTickStroke,
  coordGuideStroke,
  clamp,
  clampPointToGrid,
  snapPointToGrid,
  clampAndSnapPoint,
  drawGrid,
  drawAxes,
  valueToGridX as sheetValueToGridX,
  valueToGridY as sheetValueToGridY,
  valuesToSvgPoint as sheetValuesToSvgPoint
} from './sheet.js';



function $(id) {
  return document.getElementById(id);
}

function mmToCss(mm) {
  return mm + 'mm';
}


let svg;
let tickContainer;
let tickMarksGroup;
let scaleStepMarksGroup;
let experimentalPointsGroup;
let slopePointsGroup;
let intersectionPointsGroup;

const axisLabels = { x: '', y: '' };

let scaleXValue = '';
let scaleYValue = '';
let stepXValue = '';
let stepYValue = '';

const ticksX = new Set();
const ticksY = new Set();

let mappedX = {};
let mappedY = {};
let experimentalPointsData = [];
let slopePointsData = [];
let slopePointsData2 = [];
let intersectionPointsData1 = { x: null, y: null };
let intersectionPointsData2 = { x: null, y: null };
let hasUnsavedChanges = false;

let magnifierActive = false;
/* Zona reală din grafic pe care o vede lupa */
const MAGNIFIER_SOURCE_LONG = 24;
const MAGNIFIER_SOURCE_SHORT = 13;
const MAGNIFIER_TEXT_SIZE = 1.15;
const MAGNIFIER_TICK_LABEL_COLOR = '#1449b3';

/* Elementele lupei — vor fi găsite în init */
let magnifierSensorsGroup;
let magnifierLens;
let magnifierSvg;
let magnifierExtraLabels;

const trendlineStates = {
  1: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  2: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  3: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  4: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  5: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  6: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null }
};

let trendlineConfigs = {};

const curveLineState = {
  isVisible: false,
  isFixed: false,
  points: [],
  dragIndex: null,
  pointerId: null
};

function markDirty() {
  hasUnsavedChanges = true;
}

function markSaved() {
  hasUnsavedChanges = false;
}

window.addEventListener('beforeunload', (e) => {
  if (!hasUnsavedChanges) return;
  e.preventDefault();
  e.returnValue = '';
});



function getSvgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function clearInput(id) {
  const el = $(id);
  if (el) el.value = '';
}

function getNumberFromInput(id) {
  const el = $(id);
  if (!el) return NaN;
  return parseFloat(el.value);
}



// noile functii care iau calculele din sheet.js
function valueToGridX(value) {
  return sheetValueToGridX(value, scaleXValue);
}

function valueToGridY(value) {
  return sheetValueToGridY(value, scaleYValue);
}

function valuesToSvgPoint(valueX, valueY) {
  return sheetValuesToSvgPoint(valueX, valueY, scaleXValue, scaleYValue);
}

function isOriginValue(value) {
  return Math.abs(Number(value)) < 1e-9;
}

function addTickX(value) {
  if (!isOriginValue(value)) ticksX.add(value);
}

function addTickY(value) {
  if (!isOriginValue(value)) ticksY.add(value);
}

function isTickXInUse(value) {
  return experimentalPointsData.some(pt => pt.x === value) ||
    slopePointsData.some(pt => pt && pt.x === value) ||
    slopePointsData2.some(pt => pt && pt.x === value) ||
    intersectionPointsData1.x === value ||
    intersectionPointsData2.x === value;
}

function isTickYInUse(value) {
  return experimentalPointsData.some(pt => pt.y === value) ||
    slopePointsData.some(pt => pt && pt.y === value) ||
    slopePointsData2.some(pt => pt && pt.y === value) ||
    intersectionPointsData1.y === value ||
    intersectionPointsData2.y === value;
}

function pruneUnusedTick(axis, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return;

  if (axis === 'x' && !isTickXInUse(value)) ticksX.delete(value);
  if (axis === 'y' && !isTickYInUse(value)) ticksY.delete(value);
}

function addAxisMarker(group, axis, coord, label, color, pointX = null) {
  if (isOriginValue(label)) return;

  const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

  if (axis === 'x') {
    tick.setAttribute('x1', coord);
    tick.setAttribute('y1', y0 - 1.5);
    tick.setAttribute('x2', coord);
    tick.setAttribute('y2', y0 + 1.5);

    text.setAttribute('x', coord);
    text.setAttribute('y', y0 + 5);
    text.setAttribute('text-anchor', 'middle');
  } else {
    tick.setAttribute('x1', originX - 1.5);
    tick.setAttribute('y1', coord);
    tick.setAttribute('x2', originX + 1.5);
    tick.setAttribute('y2', coord);

    const labelOnRight = pointX !== null && pointX < originX;

    text.setAttribute('x', labelOnRight ? originX + 2.2 : originX - 2.2);
    text.setAttribute('y', coord + 1.2);
    text.setAttribute('text-anchor', labelOnRight ? 'start' : 'end');
  }
    text.setAttribute('data-axis', axis);
    tick.setAttribute('stroke', color);
    tick.setAttribute('stroke-width', 0.45);


    text.textContent = label;
    text.setAttribute('font-size', '3.4');
    text.setAttribute('font-family', 'Poppins, Arial, sans-serif');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', color);
    text.setAttribute('stroke', '#ffffff');
    text.setAttribute('stroke-width', '0.35');
    text.setAttribute('paint-order', 'stroke');
    text.setAttribute('pointer-events', 'none');

      
      /*  Dacă eticheta este prea apropiată pentru graficul normal,
          păstrăm tickul pe grafic și mutăm textul numai în lupă.*/
        
      if (hasSpecialTextNear(axis, coord)) {
          group.appendChild(tick);
          return;
  }

  group.appendChild(tick);
  group.appendChild(text);
}

// funcția care șterge inputurile de labels daca se scrie o valoare specială
function hasSpecialAxisMarker(axis, value) {
  const same = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;

  if (experimentalPointsData.some(pt => axis === 'x' ? same(pt.x, value) : same(pt.y, value))) return true;
  if (slopePointsData.some(pt => pt && (axis === 'x' ? same(pt.x, value) : same(pt.y, value)))) return true;
  if (slopePointsData2.some(pt => pt && (axis === 'x' ? same(pt.x, value) : same(pt.y, value)))) return true;

  if (axis === 'x' && intersectionPointsData1.x !== null && same(intersectionPointsData1.x, value)) return true;
  if (axis === 'y' && intersectionPointsData1.y !== null && same(intersectionPointsData1.y, value)) return true;
  if (axis === 'x' && intersectionPointsData2.x !== null && same(intersectionPointsData2.x, value)) return true;
  if (axis === 'y' && intersectionPointsData2.y !== null && same(intersectionPointsData2.y, value)) return true;

  return false;
}
//funcția care nu scrie valori înghesuite
function hasSpecialTextNear(axis, coord, tolerance = 5) {
  const groups = [experimentalPointsGroup, slopePointsGroup, intersectionPointsGroup];
  const texts = groups.flatMap(group =>
    group ? Array.from(group.querySelectorAll(`text[data-axis="${axis}"]`)) : []
  );

  return texts.some((text) => {
    const pos = parseFloat(axis === 'x' ? text.getAttribute('x') : text.getAttribute('y'));
    return !Number.isNaN(pos) && Math.abs(pos - coord) <= tolerance;
  });
}


function getNormalSvgPixelScale() {
  const graphRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  if (!graphRect.width || !viewBox.width) return 1;
  return graphRect.width / viewBox.width;
}

function getSvgNumber(element, attr, fallback = 0) {
  const value = parseFloat(element.getAttribute(attr));
  return Number.isNaN(value) ? fallback : value;
}

function createMagnifierText(textValue, x, y, anchor, color, normalScale) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.textContent = textValue;
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('text-anchor', anchor);
  text.setAttribute('font-size', MAGNIFIER_TEXT_SIZE * normalScale);
  text.setAttribute('font-family', 'Poppins, Arial, sans-serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', color);
  text.setAttribute('stroke', '#ffffff');
  text.setAttribute('stroke-width', 0.35 * normalScale);
  text.setAttribute('paint-order', 'stroke');
  text.setAttribute('pointer-events', 'none');
  text.classList.add('magnifier-fixed-label');
  return text;
}

function appendMagnifierAxisLabel(group, axis, value, coord, color, mapPoint, normalScale, pointX = null) {
  if (isOriginValue(value)) return;

  if (axis === 'x') {
    const mapped = mapPoint(coord, y0 + 5);
    group.appendChild(
      createMagnifierText(value, mapped.x, mapped.y, 'middle', color, normalScale)
    );
    return;
  }

  const labelOnRight = pointX !== null && pointX < originX;
  const mapped = mapPoint(
    labelOnRight ? originX + 2.2 : originX - 2.2,
    coord + 1.2
  );

  group.appendChild(
    createMagnifierText(
      value,
      mapped.x,
      mapped.y,
      labelOnRight ? 'start' : 'end',
      color,
      normalScale
    )
  );
}

function cloneLineForMagnifier(line, group, mapPoint, normalScale) {
  const x1 = getSvgNumber(line, 'x1');
  const y1 = getSvgNumber(line, 'y1');
  const x2 = getSvgNumber(line, 'x2');
  const y2 = getSvgNumber(line, 'y2');
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const p1 = mapPoint(x1, y1);
  const p2 = mapPoint(x2, y2);
  const cloned = line.cloneNode(false);

  cloned.removeAttribute('marker-end');

  if (dx < 0.01 && dy <= 6) {
    const center = mapPoint(x1, (y1 + y2) / 2);
    const half = (dy * normalScale) / 2;
    cloned.setAttribute('x1', center.x);
    cloned.setAttribute('x2', center.x);
    cloned.setAttribute('y1', center.y - half);
    cloned.setAttribute('y2', center.y + half);
  } else if (dy < 0.01 && dx <= 6) {
    const center = mapPoint((x1 + x2) / 2, y1);
    const half = (dx * normalScale) / 2;
    cloned.setAttribute('x1', center.x - half);
    cloned.setAttribute('x2', center.x + half);
    cloned.setAttribute('y1', center.y);
    cloned.setAttribute('y2', center.y);
  } else {
    cloned.setAttribute('x1', p1.x);
    cloned.setAttribute('y1', p1.y);
    cloned.setAttribute('x2', p2.x);
    cloned.setAttribute('y2', p2.y);
  }

  cloned.setAttribute('stroke-width', getSvgNumber(line, 'stroke-width', 0.25) * normalScale);
  group.appendChild(cloned);
}

function cloneCircleForMagnifier(circle, group, mapPoint, normalScale) {
  const center = mapPoint(getSvgNumber(circle, 'cx'), getSvgNumber(circle, 'cy'));
  const cloned = circle.cloneNode(false);

  cloned.setAttribute('cx', center.x);
  cloned.setAttribute('cy', center.y);
  cloned.setAttribute('r', getSvgNumber(circle, 'r', 0.7) * normalScale);
  cloned.setAttribute('stroke-width', getSvgNumber(circle, 'stroke-width', 0) * normalScale);
  group.appendChild(cloned);
}

function cloneTextForMagnifier(text, group, mapPoint, normalScale) {
  if (text.classList.contains('axis-label-svg')) return;

  const mapped = mapPoint(getSvgNumber(text, 'x'), getSvgNumber(text, 'y'));
  const cloned = text.cloneNode(true);

  cloned.setAttribute('x', mapped.x);
  cloned.setAttribute('y', mapped.y);
  cloned.setAttribute('font-size', getSvgNumber(text, 'font-size', 3.4) * normalScale);
  cloned.setAttribute('stroke-width', getSvgNumber(text, 'stroke-width', 0) * normalScale);
  group.appendChild(cloned);
}

function clonePathForMagnifier(path, group, sourceMinX, sourceMinY, magnifierScale, normalScale) {
  const cloned = path.cloneNode(false);
  const currentTransform = cloned.getAttribute('transform') || '';

  cloned.setAttribute(
    'transform',
    `translate(${-sourceMinX * magnifierScale} ${-sourceMinY * magnifierScale}) scale(${magnifierScale}) ${currentTransform}`.trim()
  );
  cloned.setAttribute('vector-effect', 'non-scaling-stroke');
  cloned.setAttribute('stroke-width', getSvgNumber(path, 'stroke-width', 0.25) * normalScale);
  group.appendChild(cloned);
}

function cloneGraphicElementForMagnifier(element, group, mapPoint, sourceMinX, sourceMinY, magnifierScale, normalScale) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'line') cloneLineForMagnifier(element, group, mapPoint, normalScale);
  if (tagName === 'circle') cloneCircleForMagnifier(element, group, mapPoint, normalScale);
  if (tagName === 'text') cloneTextForMagnifier(element, group, mapPoint, normalScale);
  if (tagName === 'path') clonePathForMagnifier(element, group, sourceMinX, sourceMinY, magnifierScale, normalScale);
}

function cloneGraphGroupForMagnifier(sourceGroup, targetGroup, mapPoint, sourceMinX, sourceMinY, magnifierScale, normalScale) {
  if (!sourceGroup) return;

  sourceGroup.querySelectorAll('line, circle, text, path').forEach((element) => {
    cloneGraphicElementForMagnifier(
      element,
      targetGroup,
      mapPoint,
      sourceMinX,
      sourceMinY,
      magnifierScale,
      normalScale
    );
  });
}

function populateMagnifierExtraLabels(group, mapPoint, normalScale) {
  const scaleValX = parseFloat(scaleXValue);
  const scaleValY = parseFloat(scaleYValue);
  const stepX = parseFloat(stepXValue);
  const stepY = parseFloat(stepYValue);

  if (!isNaN(scaleValX) && scaleValX !== 0) {
    Array.from(ticksX).forEach((val) => {
      if (hasSpecialAxisMarker('x', val)) return;
      const coord = valueToGridX(val);
      if (coord !== null) appendMagnifierAxisLabel(group, 'x', val, coord, MAGNIFIER_TICK_LABEL_COLOR, mapPoint, normalScale);
    });
  }

  if (!isNaN(scaleValY) && scaleValY !== 0) {
    Array.from(ticksY).forEach((val) => {
      if (hasSpecialAxisMarker('y', val)) return;
      const coord = valueToGridY(val);
      if (coord !== null) appendMagnifierAxisLabel(group, 'y', val, coord, MAGNIFIER_TICK_LABEL_COLOR, mapPoint, normalScale);
    });
  }

  if (!isNaN(scaleValX) && scaleValX !== 0 && !isNaN(stepX) && stepX > 0) {
    const maxXValue = (gridWidth / 2 / 10) * scaleValX;
    const numStepsX = Math.floor(maxXValue / stepX);
    for (let i = -numStepsX; i <= numStepsX; i++) {
      if (i === 0) continue;
      const value = Number((i * stepX).toFixed(6));
      if (hasSpecialAxisMarker('x', value)) continue;
      const coord = valueToGridX(value);
      if (coord !== null) appendMagnifierAxisLabel(group, 'x', value, coord, '#146f9c', mapPoint, normalScale);
    }
  }

  if (!isNaN(scaleValY) && scaleValY !== 0 && !isNaN(stepY) && stepY > 0) {
    const maxYValue = (gridHeight / 10) * scaleValY;
    const numStepsY = Math.floor(maxYValue / stepY);
    for (let i = 1; i <= numStepsY; i++) {
      const value = Number((i * stepY).toFixed(6));
      if (hasSpecialAxisMarker('y', value)) continue;
      const coord = valueToGridY(value);
      if (coord !== null) appendMagnifierAxisLabel(group, 'y', value, coord, '#146f9c', mapPoint, normalScale);
    }
  }

  experimentalPointsData.forEach((pt) => {
    const point = valuesToSvgPoint(pt.x, pt.y);
    if (!point) return;
    appendMagnifierAxisLabel(group, 'x', pt.x, point.x, '#f63fcb', mapPoint, normalScale);
    appendMagnifierAxisLabel(group, 'y', pt.y, point.y, '#f63fcb', mapPoint, normalScale, point.x);
  });

  [...slopePointsData, ...slopePointsData2].forEach((pt) => {
    if (!pt) return;
    const point = valuesToSvgPoint(pt.x, pt.y);
    if (!point) return;
    appendMagnifierAxisLabel(group, 'x', pt.x, point.x, '#f06216', mapPoint, normalScale);
    appendMagnifierAxisLabel(group, 'y', pt.y, point.y, '#f06216', mapPoint, normalScale, point.x);
  });

  [intersectionPointsData1, intersectionPointsData2].forEach((data) => {
    if (data.x !== null) {
      const x = valueToGridX(data.x);
      if (x !== null) appendMagnifierAxisLabel(group, 'x', data.x, x, '#9f1ef5', mapPoint, normalScale);
    }
    if (data.y !== null) {
      const y = valueToGridY(data.y);
      if (y !== null) appendMagnifierAxisLabel(group, 'y', data.y, y, '#9f1ef5', mapPoint, normalScale);
    }
  });
}

function renderMagnifierContent(sourceMinX, sourceMinY, sourceWidth, sourceHeight) {
  const lensWidth = magnifierLens.offsetWidth;
  const lensHeight = magnifierLens.offsetHeight;
  const magnifierScale = Math.min(lensWidth / sourceWidth, lensHeight / sourceHeight);
  const normalScale = getNormalSvgPixelScale();
  const contentWidth = sourceWidth * magnifierScale;
  const contentHeight = sourceHeight * magnifierScale;
  const offsetX = (lensWidth - contentWidth) / 2;
  const offsetY = (lensHeight - contentHeight) / 2;

  magnifierSvg.setAttribute('viewBox', `0 0 ${lensWidth} ${lensHeight}`);
  magnifierSvg.innerHTML = '<rect class="magnifier-background" x="0" y="0" width="100%" height="100%"></rect>';

  const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const clipId = 'magnifier-content-clip';
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

  clipPath.setAttribute('id', clipId);
  clipRect.setAttribute('x', offsetX);
  clipRect.setAttribute('y', offsetY);
  clipRect.setAttribute('width', contentWidth);
  clipRect.setAttribute('height', contentHeight);
  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);
  magnifierSvg.appendChild(defs);

  contentGroup.setAttribute('clip-path', `url(#${clipId})`);
  magnifierSvg.appendChild(contentGroup);

  const mapPoint = (x, y) => ({
    x: offsetX + (x - sourceMinX) * magnifierScale,
    y: offsetY + (y - sourceMinY) * magnifierScale
  });

  [
    $('grid-lines'),
    $('axes'),
    tickMarksGroup,
    scaleStepMarksGroup,
    $('trendline-layer-1'),
    $('trendline-layer-2'),
    $('trendline-layer-3'),
    $('trendline-layer-4'),
    $('trendline-layer-5'),
    $('trendline-layer-6'),
    $('curveline-layer'),
    experimentalPointsGroup,
    slopePointsGroup,
    intersectionPointsGroup
  ].forEach((sourceGroup) => {
    cloneGraphGroupForMagnifier(
      sourceGroup,
      contentGroup,
      mapPoint,
      sourceMinX,
      sourceMinY,
      magnifierScale,
      normalScale
    );
  });

  populateMagnifierExtraLabels(contentGroup, mapPoint, normalScale);
}

// funcția refreshTicks corectată:
// - etichetele sunt SVG, nu HTML;
// - nu scrie peste texte Step existente;
// - hover-ul folosește un senzor unic pe OX și unul pe OY;
// - hover-ul arată maxim 3 valori din zona cursorului;
// - hover-ul pe OY este rotit.
function refreshTicks() {
  mappedX = {};
  mappedY = {};
  tickContainer.innerHTML = '';
  tickMarksGroup.innerHTML = '';

  const scaleValX = parseFloat(scaleXValue);
  const scaleValY = parseFloat(scaleYValue);

  function makeSvgText(textValue, x, y, anchor, size = 3.8) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = textValue;
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', anchor);
    text.setAttribute('font-size', size);
    text.setAttribute('font-family', 'Poppins, Arial, sans-serif');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', '#1449b3');
    text.setAttribute('pointer-events', 'none');

    return text;
  }

  function hasTextNear(x, y, toleranceX = 5, toleranceY = 4) {
    const stepTexts = scaleStepMarksGroup
      ? Array.from(scaleStepMarksGroup.querySelectorAll('text'))
      : [];

    const tickTexts = Array.from(tickMarksGroup.querySelectorAll('text'));
    const texts = [...stepTexts, ...tickTexts];

    for (const text of texts) {
      const tx = parseFloat(text.getAttribute('x'));
      const ty = parseFloat(text.getAttribute('y'));

      if (Number.isNaN(tx) || Number.isNaN(ty)) continue;

      if (Math.abs(tx - x) <= toleranceX && Math.abs(ty - y) <= toleranceY) {
        return true;
      }
    }

    return false;
  }



  let xItems = [];
  let yItems = [];

  if (!isNaN(scaleValX) && scaleValX !== 0) {
    xItems = Array.from(ticksX)
      .sort((a, b) => a - b)
      .map((val) => ({
        val,
        coord: originX + Math.round((val / scaleValX) * 10)
      }))
      .filter((item) => item.coord >= x0 && item.coord <= x0 + gridWidth);

    let lastLabelX = -Infinity;
    const minLabelSpacingX = 8;
    const labelY = y0 + 8;

    xItems.forEach((item) => {
      const val = item.val;
      const xCoord = item.coord;
      if (hasSpecialAxisMarker('x', val)) return;

      mappedX[val] = xCoord;

      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', xCoord);
      tick.setAttribute('y1', y0);
      tick.setAttribute('x2', xCoord);
      tick.setAttribute('y2', y0 + 4);
      tick.setAttribute('stroke', 'red');
      tick.setAttribute('stroke-width', axisTickStroke);
      tickMarksGroup.appendChild(tick);

      const canShowLabel =
        xCoord - lastLabelX >= minLabelSpacingX &&
        !hasTextNear(xCoord, labelY);

      if (canShowLabel) {
        const text = makeSvgText(val, xCoord, labelY, 'middle');
        tickMarksGroup.appendChild(text);
        lastLabelX = xCoord;
      }
    });

  }

  if (!isNaN(scaleValY) && scaleValY !== 0) {
    yItems = Array.from(ticksY)
      .sort((a, b) => a - b)
      .map((val) => ({
        val,
        coord: y0 - Math.round((val / scaleValY) * 10)
      }))
      .filter((item) => item.coord <= y0 && item.coord >= y0 - gridHeight);

    let lastLabelY = Infinity;
    const minLabelSpacingY = 6;
    const labelX = originX - 4;

    yItems.forEach((item) => {
      const val = item.val;
      const yCoord = item.coord;
      if (hasSpecialAxisMarker('y', val)) return;

      mappedY[val] = yCoord;

      const ytick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ytick.setAttribute('x1', originX);
      ytick.setAttribute('y1', yCoord);
      ytick.setAttribute('x2', originX - 4);
      ytick.setAttribute('y2', yCoord);
      ytick.setAttribute('stroke', 'red');
      ytick.setAttribute('stroke-width', axisTickStroke);
      tickMarksGroup.appendChild(ytick);
            const canShowLabel =
        Math.abs(yCoord - lastLabelY) >= minLabelSpacingY &&
        !hasTextNear(labelX, yCoord + 1.2);

      if (canShowLabel) {
        const text = makeSvgText(val, labelX, yCoord + 1.2, 'end');
        tickMarksGroup.appendChild(text);
        lastLabelY = yCoord;
      }
    });

  }
}
function refreshScaleStepLabels() {
  if (!scaleStepMarksGroup) return;

  scaleStepMarksGroup.innerHTML = '';

  const scaleX = parseFloat(scaleXValue);
  const scaleY = parseFloat(scaleYValue);
  const stepX = parseFloat(stepXValue);
  const stepY = parseFloat(stepYValue);

  if (!isNaN(scaleX) && scaleX !== 0 && !isNaN(stepX) && stepX > 0) {
    const maxXValue = (gridWidth / 2 / 10) * scaleX;
    const numStepsX = Math.floor(maxXValue / stepX);

    for (let i = -numStepsX; i <= numStepsX; i++) {
      if (i === 0) continue;

      const value = i * stepX;
      if (hasSpecialAxisMarker('x', value)) continue;
      const x = originX + (value / scaleX) * 10;

      if (x < x0 || x > x0 + gridWidth) continue;

      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      mark.setAttribute('x1', x);
      mark.setAttribute('y1', y0 - 1.5);
      mark.setAttribute('x2', x);
      mark.setAttribute('y2', y0 + 1.5);
      mark.setAttribute('stroke', '#146f9c');
      mark.setAttribute('stroke-width', 0.25);
      scaleStepMarksGroup.appendChild(mark);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = Number(value.toFixed(6));
      text.setAttribute('x', x);
      text.setAttribute('y', y0 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '3.2');
      text.setAttribute('font-family', 'Poppins, sans-serif');
      text.setAttribute('fill', '#146f9c');
      scaleStepMarksGroup.appendChild(text);
    }
  }

  if (!isNaN(scaleY) && scaleY !== 0 && !isNaN(stepY) && stepY > 0) {
    const maxYValue = (gridHeight / 10) * scaleY;
    const numStepsY = Math.floor(maxYValue / stepY);

    for (let i = 1; i <= numStepsY; i++) {
      const value = i * stepY;
      if (hasSpecialAxisMarker('y', value)) continue;
      const y = y0 - (value / scaleY) * 10;

      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      mark.setAttribute('x1', originX - 1.5);
      mark.setAttribute('y1', y);
      mark.setAttribute('x2', originX + 1.5);
      mark.setAttribute('y2', y);
      mark.setAttribute('stroke', '#146f9c');
      mark.setAttribute('stroke-width', 0.25);
      scaleStepMarksGroup.appendChild(mark);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = Number(value.toFixed(6));
      text.setAttribute('x', originX - 3);
      text.setAttribute('y', y + 1.2);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '3.2');
      text.setAttribute('font-family', 'Poppins, sans-serif');
      text.setAttribute('fill', '#146f9c');
      scaleStepMarksGroup.appendChild(text);
    }
  }
}

function drawExperimentalPoint(valueX, valueY) {
  const pointPosition = valuesToSvgPoint(valueX, valueY);
  if (!pointPosition) return;

  const x = pointPosition.x;
  const y = pointPosition.y;

  const pointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  pointGroup.dataset.valueX = String(valueX);
  pointGroup.dataset.valueY = String(valueY);

  const createGuideLine = (x1, y1, x2, y2) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#931976');
    line.setAttribute('stroke-width', coordGuideStroke);
    line.setAttribute('stroke-dasharray', '1,1');
    return line;
  };

  pointGroup.appendChild(createGuideLine(x, y0, x, y));
  pointGroup.appendChild(createGuideLine(originX, y, x, y));

  const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  point.setAttribute('cx', x);
  point.setAttribute('cy', y);
  point.setAttribute('r', 0.7);
  point.setAttribute('fill', '#f63fcb');
  pointGroup.appendChild(point);

  addAxisMarker(pointGroup, 'x', x, valueX, '#f63fcb');
  addAxisMarker(pointGroup, 'y', y, valueY, '#f63fcb',x);

  experimentalPointsGroup.appendChild(pointGroup);
}

function redrawExperimentalPoints() {
  experimentalPointsGroup.innerHTML = '';

  const uniquePoints = [];
  const seen = new Set();

  experimentalPointsData.forEach((pt) => {
    const key = pt.x + '|' + pt.y;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePoints.push(pt);
    }
  });

  experimentalPointsData = uniquePoints.filter((pt) => valuesToSvgPoint(pt.x, pt.y));
  experimentalPointsData.forEach((pt) => drawExperimentalPoint(pt.x, pt.y));
}

function addDataPoint() {
  const button = $('add-point');

  button.classList.remove('is-popping');
  button.addEventListener(
  'animationend',
  () => button.classList.remove('is-popping'),
  { once: true }
  );

  void button.offsetWidth;
  button.classList.add('is-popping');
  
  const inputX = $('point-input-x');
  const inputY = $('point-input-y');

  const valX = parseFloat(inputX.value);
  const valY = parseFloat(inputY.value);

  if (isNaN(valX) || isNaN(valY)) return;

  if (!valuesToSvgPoint(valX, valY)) {
    alert('Verifică scara. Punctul trebuie să fie în interiorul graficului.');
    return;
  }

  addTickX(valX);
  addTickY(valY);
  experimentalPointsData.push({ x: valX, y: valY });

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();

  inputX.value = '';
  inputY.value = '';
}

function deleteTickXValue(val) {
  if (ticksX.has(val)) {
    ticksX.delete(val);
    refreshTicks();
  }
}

function deleteTickYValue(val) {
  if (ticksY.has(val)) {
    ticksY.delete(val);
    refreshTicks();
  }
}

function deletePointByValues(valX, valY) {
  experimentalPointsData = experimentalPointsData.filter(pt => !(pt.x === valX && pt.y === valY));
  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
}
function deleteFullDataPoint() {
  const inputX = $('point-input-x');
  const inputY = $('point-input-y');

  const valX = parseFloat(inputX.value);
  const valY = parseFloat(inputY.value);

  if (isNaN(valX) || isNaN(valY)) return;

  deletePointByValues(valX, valY);

  pruneUnusedTick('x', valX);
  pruneUnusedTick('y', valY);

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();

  inputX.value = '';
  inputY.value = '';
}

function updateScale(axis, rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed !== '' && Number.isNaN(parseFloat(trimmed))) return;

  if (axis === 'x') scaleXValue = trimmed;
  else scaleYValue = trimmed;

  experimentalPointsGroup.innerHTML = '';
  resetAllTrendlines();
  resetCurveLine();
  resetSlopePoints();
  resetIntersections();
  refreshTicks();
  refreshScaleStepLabels();
  redrawExperimentalPoints();
}

function drawSlopePoint(pointData, label) {
  const point = valuesToSvgPoint(pointData.x, pointData.y);
  if (!point) return;

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  const guideV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  guideV.setAttribute('x1', point.x);
  guideV.setAttribute('y1', y0);
  guideV.setAttribute('x2', point.x);
  guideV.setAttribute('y2', point.y);
  guideV.setAttribute('stroke', '#f06216');
  guideV.setAttribute('stroke-width', 0.25);
  guideV.setAttribute('stroke-dasharray', '2,2');
  group.appendChild(guideV);

  const guideH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  guideH.setAttribute('x1', originX);
  guideH.setAttribute('y1', point.y);
  guideH.setAttribute('x2', point.x);
  guideH.setAttribute('y2', point.y);
  guideH.setAttribute('stroke', '#f06216');
  guideH.setAttribute('stroke-width', 0.25);
  guideH.setAttribute('stroke-dasharray', '2,2');
  group.appendChild(guideH);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 1);
  circle.setAttribute('fill', '#f06216');
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', 0.35);
  group.appendChild(circle);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.textContent = label + '(' + pointData.x + '; ' + pointData.y + ')';
  text.setAttribute('x', point.x + 2.2);
  text.setAttribute('y', point.y - 2.2);
  text.setAttribute('font-size', '3.4');
  text.setAttribute('font-family', 'Poppins, Arial, sans-serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', '#f06216');
  group.appendChild(text);
  addAxisMarker(group, 'x', point.x, pointData.x, '#f06216');
  addAxisMarker(group, 'y', point.y, pointData.y, '#f06216', point.x);

  slopePointsGroup.appendChild(group);
}

function redrawSlopePoints() {
  slopePointsGroup.innerHTML = '';
  if (slopePointsData[0]) drawSlopePoint(slopePointsData[0], 'P₁');
  if (slopePointsData[1]) drawSlopePoint(slopePointsData[1], 'P₂');
  if (slopePointsData2[0]) drawSlopePoint(slopePointsData2[0], 'S₁');
  if (slopePointsData2[1]) drawSlopePoint(slopePointsData2[1], 'S₂');
}

function resetSlopePoint(
  index,
  pointsData = slopePointsData,
  inputPrefix = 'p'
) {
  const oldPoint = pointsData[index];

  pointsData[index] = null;

  if (oldPoint) {
    pruneUnusedTick('x', oldPoint.x);
    pruneUnusedTick('y', oldPoint.y);
  }

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();

  clearInput(`slope-${inputPrefix}${index + 1}-x`);
  clearInput(`slope-${inputPrefix}${index + 1}-y`);
}

function resetSlopePoints() {
  const oldPoints = [
    ...slopePointsData,
    ...slopePointsData2
  ];

  slopePointsData = [null, null];
  slopePointsData2 = [null, null];

  oldPoints.forEach((pt) => {
    if (pt) {
      pruneUnusedTick('x', pt.x);
      pruneUnusedTick('y', pt.y);
    }
  });

  slopePointsGroup.innerHTML = '';

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
}

function drawIntersectionPoint(kind, value) {
  let point = null;

  if (kind === 'x') {
    const x = valueToGridX(value);
    if (x === null) return;
    point = { x: x, y: y0 };
  }

  if (kind === 'y') {
    const y = valueToGridY(value);
    if (y === null) return;
    point = { x: originX, y: y };
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 0.8);
  circle.setAttribute('fill', '#9f1ef5');
  circle.setAttribute('stroke', 'none');
  group.appendChild(circle);
    if (kind === 'x') {
  addAxisMarker(group, 'x', point.x, value, '#9f1ef5');
    }

  if (kind === 'y') {
  addAxisMarker(group, 'y', point.y, value, '#9f1ef5');
    }

  intersectionPointsGroup.appendChild(group);
}
function redrawIntersectionPoints() {
  intersectionPointsGroup.innerHTML = '';

  if (intersectionPointsData1.x !== null) drawIntersectionPoint('x', intersectionPointsData1.x);
  if (intersectionPointsData1.y !== null) drawIntersectionPoint('y', intersectionPointsData1.y);

  if (intersectionPointsData2.x !== null) drawIntersectionPoint('x', intersectionPointsData2.x);
  if (intersectionPointsData2.y !== null) drawIntersectionPoint('y', intersectionPointsData2.y);
}
function redrawAllSpecialPoints() {
  experimentalPointsGroup.innerHTML = '';
  slopePointsGroup.innerHTML = '';
  intersectionPointsGroup.innerHTML = '';
  if (magnifierExtraLabels) {
  magnifierExtraLabels.innerHTML = '';
  }

  redrawIntersectionPoints();// prioritate 1
  redrawExperimentalPoints();// prioritate 2
  redrawSlopePoints();// prioritate 3
}

function resetIntersections() {
  intersectionPointsData = { x: null, y: null };
  intersectionPointsGroup.innerHTML = '';
}

function initTrendlineConfigs() {
  trendlineConfigs = {
    1: {
      layer: $('trendline-layer-1'),
      activateBtn: $('activate-trendline-1'),
      fixBtn: $('fix-trendline-1'),
      resetBtn: $('reset-trendline-1'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    2: {
      layer: $('trendline-layer-2'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    3: {
      layer: $('trendline-layer-3'),
      color: '#0208cb',
      fixedColor: '#0008ff',
    },
    4: {
      layer: $('trendline-layer-4'),
      activateBtn: $('activate-trendline-4'),
      fixBtn: $('fix-trendline-4'),
      resetBtn: $('reset-trendline-4'),
      color: '#00897B',
      fixedColor:'#029688'
    },
    5: {
      layer: $('trendline-layer-5'),
      color: '#00897B',
      fixedColor: '#029688'
    },
    6: {
      layer: $('trendline-layer-6'),
      color: '#00897B',
      fixedColor: '#029688'
    }
  };
}

function updateTrendlineButtons(index) {
  const state = trendlineStates[index];
  const cfg = trendlineConfigs[index];

  if (cfg.fixBtn) cfg.fixBtn.disabled = !state.isVisible || state.isFixed;
  if (cfg.resetBtn) cfg.resetBtn.disabled = !state.isVisible;
  if (cfg.activateBtn) {
  cfg.activateBtn.classList.toggle('is-active', state.isVisible && !state.isFixed);
}

  updateExtensionButtons();
}

function updateExtensionButtons() {
  const ext2 = trendlineStates[2];
  const ext3 = trendlineStates[3];

  const anyVisible = ext2.isVisible || ext3.isVisible;
  const allFixed = (!ext2.isVisible || ext2.isFixed) && (!ext3.isVisible || ext3.isFixed);

  if ($('fix-extensions')) $('fix-extensions').disabled = !anyVisible || allFixed;
  if ($('reset-extensions')) $('reset-extensions').disabled = !anyVisible;

  const ext5 = trendlineStates[5];
  const ext6 = trendlineStates[6];

  const anyVisible2 = ext5.isVisible || ext6.isVisible;
  const allFixed2 = (!ext5.isVisible || ext5.isFixed) && (!ext6.isVisible || ext6.isFixed);

  if ($('fix-extensions-2')) $('fix-extensions-2').disabled = !anyVisible2 || allFixed2;
  if ($('reset-extensions-2')) $('reset-extensions-2').disabled = !anyVisible2;
}

function resetTrendline(index) {
  const state = trendlineStates[index];
  const cfg = trendlineConfigs[index];

  state.isVisible = false;
  state.isFixed = false;
  state.p1 = null;
  state.p2 = null;
  state.dragMode = null;
  state.pointerId = null;
  state.lastPoint = null;

  cfg.layer.innerHTML = '';
  updateTrendlineButtons(index);
}

function resetAllTrendlines() {
  resetTrendline(1);
  resetTrendline(2);
  resetTrendline(3);
  resetTrendline(4);
  resetTrendline(5);
  resetTrendline(6);
}

function createDefaultTrendline(index) {
  const state = trendlineStates[index];

  if (index === 1) {
    state.p1 = { x: x0 + gridWidth * 0.18, y: y0 - gridHeight * 0.28 };
    state.p2 = { x: x0 + gridWidth * 0.82, y: y0 - gridHeight * 0.72 };
  }

  if (index === 4) {
    state.p1 = { x: x0 + gridWidth * 0.18, y: y0 - gridHeight * 0.55 };
    state.p2 = { x: x0 + gridWidth * 0.82, y: y0 - gridHeight * 0.35 };
  }

  state.isVisible = true;
  state.isFixed = false;
}

function createExtensionFromTrendline(index) {
  const baseIndex = index === 5 || index === 6 ? 4 : 1;
  const base = trendlineStates[baseIndex];

  if (!base.isVisible || !base.isFixed || !base.p1 || !base.p2) {
    alert('Fixează mai întâi dreapta de tendință.');
    return false;
  }

  const extension = trendlineStates[index];
  const fixedEnd = index === 2 || index === 5 ? base.p1 : base.p2;
  const otherEnd = index === 2 || index === 5 ? base.p2 : base.p1;

  const dx = otherEnd.x - fixedEnd.x;
  const dy = otherEnd.y - fixedEnd.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  const unitX = dx / length;
  const unitY = dy / length;

  const extensionLength = Math.max(28, Math.min(70, length * 0.45));
  const freeEnd = clampPointToGrid({
    x: fixedEnd.x - unitX * extensionLength,
    y: fixedEnd.y - unitY * extensionLength
  });

  extension.p1 = { x: fixedEnd.x, y: fixedEnd.y };
  extension.p2 = freeEnd;
  extension.isVisible = true;
  extension.isFixed = false;
  extension.dragMode = null;
  extension.pointerId = null;
  extension.lastPoint = null;

  renderTrendline(index);
  return true;
}


function renderTrendline(index) {
  const state = trendlineStates[index];
  const cfg = trendlineConfigs[index];
  const layer = cfg.layer;
  layer.innerHTML = '';

  if (!state.isVisible || !state.p1 || !state.p2) {
    updateTrendlineButtons(index);
    return;
  }

  const visibleLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  visibleLine.setAttribute('x1', state.p1.x);
  visibleLine.setAttribute('y1', state.p1.y);
  visibleLine.setAttribute('x2', state.p2.x);
  visibleLine.setAttribute('y2', state.p2.y);
  visibleLine.setAttribute('stroke', state.isFixed ? cfg.fixedColor : cfg.color);
  visibleLine.setAttribute('stroke-width', state.isFixed ? 0.45 : 0.6);
  visibleLine.setAttribute('stroke-opacity', state.isFixed ? 1 : 0.78);
  visibleLine.setAttribute('stroke-linecap', 'round');
  if (index !== 1 && index !== 4)  visibleLine.setAttribute('stroke-dasharray', '2,1.6');
  visibleLine.dataset.role = index === 1 ? 'line' : 'extension';
  visibleLine.dataset.trendline = String(index);
  visibleLine.style.cursor = state.isFixed || (index !== 1 && index !== 4) ? 'default' : 'move';
  layer.appendChild(visibleLine);

  if (!state.isFixed) {
    if (index === 1 || index === 4) {
      const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitLine.setAttribute('x1', state.p1.x);
      hitLine.setAttribute('y1', state.p1.y);
      hitLine.setAttribute('x2', state.p2.x);
      hitLine.setAttribute('y2', state.p2.y);
      hitLine.setAttribute('stroke', '#000000');
      hitLine.setAttribute('stroke-opacity', '0.01');
      hitLine.setAttribute('stroke-width', 8);
      hitLine.setAttribute('pointer-events', 'stroke');
      hitLine.setAttribute('class', 'trend-hit');
      hitLine.dataset.role = 'line';
      hitLine.dataset.trendline = String(index);
      hitLine.style.cursor = 'move';
      layer.appendChild(hitLine);

      const handle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle1.setAttribute('cx', state.p1.x);
      handle1.setAttribute('cy', state.p1.y);
      handle1.setAttribute('r', 1.8);
      handle1.setAttribute('fill', '#ffffff');
      handle1.setAttribute('stroke', cfg.color);
      handle1.setAttribute('stroke-width', 0.4);
      handle1.setAttribute('class', 'trend-handle');
      handle1.dataset.role = 'handle1';
      handle1.dataset.trendline = String(index);
      handle1.style.cursor = 'grab';
      layer.appendChild(handle1);
    }

    const handle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle2.setAttribute('cx', state.p2.x);
    handle2.setAttribute('cy', state.p2.y);
    handle2.setAttribute('r', (index !== 1 && index !== 4) ? 2.1 : 1.8);
    handle2.setAttribute('fill', '#ffffff');
    handle2.setAttribute('stroke', cfg.color);
    handle2.setAttribute('stroke-width', 0.4);
    handle2.setAttribute('class', 'trend-handle');
    handle2.dataset.role = 'handle2';
    handle2.dataset.trendline = String(index);
    handle2.style.cursor = 'grab';
    layer.appendChild(handle2);
  }

  updateTrendlineButtons(index);
}

function createDefaultCurveLine() {
  curveLineState.points = [
    { x: x0 + 18, y: y0 - 45 },
    { x: x0 + 55, y: y0 - 95 },
    { x: x0 + 92, y: y0 - 135 },
    { x: x0 + 130, y: y0 - 165 },
    { x: x0 + 165, y: y0 - 190 }
  ].map(clampAndSnapPoint);

  curveLineState.isVisible = true;
  curveLineState.isFixed = false;
  curveLineState.dragIndex = null;
  curveLineState.pointerId = null;
}

function buildSmoothPath(points) {
  if (!points || points.length === 0) return '';

  const sorted = [...points].sort((a, b) => a.x - b.x);

  if (sorted.length === 1) {
    return `M ${sorted[0].x} ${sorted[0].y}`;
  }

  let d = `M ${sorted[0].x} ${sorted[0].y}`;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i - 1] || sorted[i];
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p3 = sorted[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function renderCurveLine() {
  const layer = $('curveline-layer');
  layer.innerHTML = '';

  if (!curveLineState.isVisible || curveLineState.points.length === 0) {
    updateCurveLineButtons();
    return;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', buildSmoothPath(curveLineState.points));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', curveLineState.isFixed ? '#d51a6b' : '#AD1457');
  path.setAttribute('stroke-width', curveLineState.isFixed ? 0.45 : 0.65);
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.dataset.role = 'curve';
  layer.appendChild(path);

  if (!curveLineState.isFixed) {
    curveLineState.points.forEach((pt, index) => {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('cx', pt.x);
      handle.setAttribute('cy', pt.y);
      handle.setAttribute('r', 1.8);
      handle.setAttribute('fill', '#ffffff');
      handle.setAttribute('stroke', '#AD1457');
      handle.setAttribute('stroke-width', 0.45);
      handle.setAttribute('class', 'curve-handle');
      handle.dataset.role = 'curve-handle';
      handle.dataset.index = String(index);
      handle.style.cursor = 'grab';
      layer.appendChild(handle);
    });
  }

  updateCurveLineButtons();
}

function updateCurveLineButtons() {
  if ($('fix-curveline')) $('fix-curveline').disabled = !curveLineState.isVisible || curveLineState.isFixed;
    if ($('reset-curveline')) $('reset-curveline').disabled = !curveLineState.isVisible;
}

function resetCurveLine() {
  curveLineState.isVisible = false;
  curveLineState.isFixed = false;
  curveLineState.points = [];
  curveLineState.dragIndex = null;
  curveLineState.pointerId = null;

  const layer = $('curveline-layer');
  if (layer) layer.innerHTML = '';

  updateCurveLineButtons();
}

function clonePoint(point) {
  if (!point) return null;
  return { x: point.x, y: point.y };
}

function cloneTrendlineState(state) {
  return {
    isVisible: state.isVisible,
    isFixed: state.isFixed,
    p1: clonePoint(state.p1),
    p2: clonePoint(state.p2)
  };
}

function restoreTrendlineState(target, saved) {
  target.isVisible = !!saved?.isVisible;
  target.isFixed = !!saved?.isFixed;
  target.p1 = clonePoint(saved?.p1);
  target.p2 = clonePoint(saved?.p2);
  target.dragMode = null;
  target.pointerId = null;
  target.lastPoint = null;
}

function getWorkState() {
  return {
    app: 'AxioGraph',
    version: 'AxioGraph_4',
    savedAt: new Date().toISOString(),
    axisLabels: {
      x: $('axis-label-input-x').value,
      y: $('axis-label-input-y').value
    },
    scale: { x: scaleXValue, y: scaleYValue },
    step: { x: stepXValue, y: stepYValue },
    ticks: {
      x: Array.from(ticksX).filter((v) => !isOriginValue(v)),
      y: Array.from(ticksY).filter((v) => !isOriginValue(v))
    },
    experimentalPoints: experimentalPointsData.map(pt => ({ x: pt.x, y: pt.y })),
   trendlines: {
      1: cloneTrendlineState(trendlineStates[1]),
      2: cloneTrendlineState(trendlineStates[2]),
      3: cloneTrendlineState(trendlineStates[3]),
      4: cloneTrendlineState(trendlineStates[4]),
      5: cloneTrendlineState(trendlineStates[5]),
      6: cloneTrendlineState(trendlineStates[6])
    },
    curveLine: {
      isVisible: curveLineState.isVisible,
      isFixed: curveLineState.isFixed,
      points: curveLineState.points.map(pt => ({ x: pt.x, y: pt.y }))
    },
    slopePoints: slopePointsData.map(pt => pt ? { x: pt.x, y: pt.y } : null),
    slopePoints2: slopePointsData2.map(pt => pt ? { x: pt.x, y: pt.y } : null),
    intersections: {
      x1: intersectionPointsData1.x !== null ? intersectionPointsData1.x : null,
      y1: intersectionPointsData1.y !== null ? intersectionPointsData1.y : null,
      x2: intersectionPointsData2.x !== null ? intersectionPointsData2.x : null,
      y2: intersectionPointsData2.y !== null ? intersectionPointsData2.y : null
    }
  };
}
function readSavedNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

function applyWorkState(state) {
  if (!state || state.app !== 'AxioGraph') {
    alert('Fișierul ales nu pare să fie o lucrare Axio validă.');
    return;
  }

  axisLabels.x = state.axisLabels?.x || '';
  axisLabels.y = state.axisLabels?.y || '';

  $('axis-label-input-x').value = axisLabels.x;
  $('axis-label-input-y').value = axisLabels.y;
  $('axis-label-x').textContent = axisLabels.x;
  $('axis-label-y').textContent = axisLabels.y;

  scaleXValue = state.scale?.x || '';
  scaleYValue = state.scale?.y || '';

  $('scale-input-x').value = scaleXValue;
  $('scale-input-y').value = scaleYValue;

  stepXValue = state.step?.x || '';
  stepYValue = state.step?.y || '';

  $('step-input-x').value = stepXValue;
  $('step-input-y').value = stepYValue;

  ticksX.clear();
  ticksY.clear();

  (state.ticks?.x || []).forEach(v => {
    const n = Number(v);
    if (!Number.isNaN(n)) addTickX(n);
  });

  (state.ticks?.y || []).forEach(v => {
    const n = Number(v);
    if (!Number.isNaN(n)) addTickY(n);
  });

  experimentalPointsData = (state.experimentalPoints || [])
    .map(pt => ({ x: Number(pt.x), y: Number(pt.y) }))
    .filter(pt => !Number.isNaN(pt.x) && !Number.isNaN(pt.y));

  restoreTrendlineState(trendlineStates[1], state.trendlines?.[1]);
  restoreTrendlineState(trendlineStates[2], state.trendlines?.[2]);
  restoreTrendlineState(trendlineStates[3], state.trendlines?.[3]);
  restoreTrendlineState(trendlineStates[4], state.trendlines?.[4]);
  restoreTrendlineState(trendlineStates[5], state.trendlines?.[5]);
  restoreTrendlineState(trendlineStates[6], state.trendlines?.[6]);

  const savedCurve = state.curveLine;
  curveLineState.isVisible = !!savedCurve?.isVisible;
  curveLineState.isFixed = !!savedCurve?.isFixed;
  curveLineState.points = (savedCurve?.points || [])
    .map(pt => ({ x: Number(pt.x), y: Number(pt.y) }))
    .filter(pt => !Number.isNaN(pt.x) && !Number.isNaN(pt.y))
    .map(clampAndSnapPoint);
  curveLineState.dragIndex = null;
  curveLineState.pointerId = null;

  slopePointsData = [0, 1].map((index) => {
    const pt = state.slopePoints?.[index];
    if (!pt) return null;

    const x = Number(pt.x);
    const y = Number(pt.y);
    return !Number.isNaN(x) && !Number.isNaN(y) ? { x, y } : null;
  });

    slopePointsData2 = [0, 1].map((index) => {
    const pt = state.slopePoints2?.[index];
    if (!pt) return null;

    const x = Number(pt.x);
    const y = Number(pt.y);
    return !Number.isNaN(x) && !Number.isNaN(y) ? { x, y } : null;
  });

  const savedIntersections = state.intersections || {};

const savedX1 =
  savedIntersections.x1 !== undefined
    ? savedIntersections.x1
    : savedIntersections.x;

const savedY1 =
  savedIntersections.y1 !== undefined
    ? savedIntersections.y1
    : savedIntersections.y;

intersectionPointsData1 = {
  x: readSavedNumber(savedX1),
  y: readSavedNumber(savedY1)
};

intersectionPointsData2 = {
  x: readSavedNumber(savedIntersections.x2),
  y: readSavedNumber(savedIntersections.y2)
};

  refreshScaleStepLabels();
  refreshTicks();

  renderTrendline(1);
  renderTrendline(2);
  renderTrendline(3);
  renderTrendline(4);
  renderTrendline(5);
  renderTrendline(6);
  renderCurveLine();

  redrawAllSpecialPoints();

  markSaved();
}

function buildDefaultFilename() {
  const now = new Date();
  const stamp =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') + '-' +
    String(now.getMinutes()).padStart(2, '0');

  return 'AxioGraph_4_' + stamp + '.axio';
}

function saveWork() {
  const data = JSON.stringify(getWorkState(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = buildDefaultFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  markSaved();
}

function loadWorkFromFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyWorkState(JSON.parse(reader.result));
    } catch (err) {
      console.error(err);
      alert('Fișierul nu a putut fi încărcat.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}


function setupInputEvents() {
  $('scale-input-x').addEventListener('input', (e) => updateScale('x', e.target.value));
  $('scale-input-y').addEventListener('input', (e) => updateScale('y', e.target.value));

  $('step-input-x').addEventListener('input', (e) => {
  stepXValue = e.target.value.trim();
  refreshScaleStepLabels();
});

$('step-input-y').addEventListener('input', (e) => {
  stepYValue = e.target.value.trim();
  refreshScaleStepLabels();
});
  $('add-point').addEventListener('click', addDataPoint);
$('delete-full-point').addEventListener('click', deleteFullDataPoint);
  $('point-input-x').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('add-point').click();
  });

  $('point-input-y').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('add-point').click();
  });

  // Funcția de adăugare a punctelor de pantă
  $('add-slope-p1').addEventListener('click', () => {
    const p1x = getNumberFromInput('slope-p1-x');
    const p1y = getNumberFromInput('slope-p1-y');

    if (!valuesToSvgPoint(p1x, p1y)) {
      alert('Verifică scara și coordonatele punctului P₁. Punctul trebuie să fie în interiorul graficului.');
      return;
    }

    const oldPoint = slopePointsData[0];

    slopePointsData[0] = { x: p1x, y: p1y };

    if (oldPoint) {
       if (oldPoint.x !== p1x) {
          pruneUnusedTick('x', oldPoint.x);
        }

        if (oldPoint.y !== p1y) {
          pruneUnusedTick('y', oldPoint.y);
        }
    }

    addTickX(p1x);
    addTickY(p1y);

    refreshTicks();
    refreshScaleStepLabels();
    redrawAllSpecialPoints();
  });

  $('add-slope-p2').addEventListener('click', () => {
    const p2x = getNumberFromInput('slope-p2-x');
    const p2y = getNumberFromInput('slope-p2-y');

    if (!valuesToSvgPoint(p2x, p2y)) {
      alert('Verifică scara și coordonatele punctului P₂. Punctul trebuie să fie în interiorul graficului.');
      return;
    }

    const oldPoint = slopePointsData[1];

    slopePointsData[1] = { x: p2x, y: p2y };

    if (oldPoint) {
      if (oldPoint.x !== p2x) {
         pruneUnusedTick('x', oldPoint.x);
      }

      if (oldPoint.y !== p2y) {
         pruneUnusedTick('y', oldPoint.y);
      }
    }

    addTickX(p2x);
    addTickY(p2y);

    refreshTicks();
    refreshScaleStepLabels();
    redrawAllSpecialPoints();
  });

    $('add-slope-s1').addEventListener('click', () => {
    const s1x = getNumberFromInput('slope-s1-x');
    const s1y = getNumberFromInput('slope-s1-y');

    if (!valuesToSvgPoint(s1x, s1y)) {
      alert('Verifică scara și coordonatele punctului S₁. Punctul trebuie să fie în interiorul graficului.');
      return;
    }

    const oldPoint = slopePointsData2[0];

    slopePointsData2[0] = { x: s1x, y: s1y };

    if (oldPoint) {
      if (oldPoint.x !== s1x) {
        pruneUnusedTick('x', oldPoint.x);
      }

      if (oldPoint.y !== s1y) {
        pruneUnusedTick('y', oldPoint.y);
      }
    }

    addTickX(s1x);
    addTickY(s1y);

    refreshTicks();
    refreshScaleStepLabels();
    redrawAllSpecialPoints();
  });

  $('add-slope-s2').addEventListener('click', () => {
    const s2x = getNumberFromInput('slope-s2-x');
    const s2y = getNumberFromInput('slope-s2-y');

    if (!valuesToSvgPoint(s2x, s2y)) {
      alert('Verifică scara și coordonatele punctului S₂. Punctul trebuie să fie în interiorul graficului.');
      return;
    }

    const oldPoint = slopePointsData2[1];

    slopePointsData2[1] = { x: s2x, y: s2y };

    if (oldPoint) {
      if (oldPoint.x !== s2x) {
        pruneUnusedTick('x', oldPoint.x);
      }

      if (oldPoint.y !== s2y) {
        pruneUnusedTick('y', oldPoint.y);
      }
    }

    addTickX(s2x);
    addTickY(s2y);

    refreshTicks();
    refreshScaleStepLabels();
    redrawAllSpecialPoints();
  });

  $('reset-slope-p1').addEventListener('click', () => resetSlopePoint(0));
  $('reset-slope-p2').addEventListener('click', () => resetSlopePoint(1));
  $('reset-slope-s1').addEventListener('click', () => resetSlopePoint(0, slopePointsData2, 's'));
  $('reset-slope-s2').addEventListener('click', () => resetSlopePoint(1, slopePointsData2, 's'));
  
  
  //Butoane pentru ambele drepte Axis Intercepts

  $('add-intersection-x').addEventListener('click', () => {
  const value = getNumberFromInput('intersection-x-value');

  if (valueToGridX(value) === null) {
    alert('Verifică scara OX și valoarea intersecției. Valoarea trebuie să fie în interiorul axei OX.');
    return;
  }

  const oldValue = intersectionPointsData1.x;

  intersectionPointsData1.x = value;

  if (oldValue !== null && oldValue !== value) {
     pruneUnusedTick('x', oldValue);
  }

  addTickX(value);

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});

$('add-intersection-y').addEventListener('click', () => {
  const value = getNumberFromInput('intersection-y-value');

  if (valueToGridY(value) === null) {
    alert('Verifică scara OY și valoarea intersecției. Valoarea trebuie să fie în interiorul axei OY.');
    return;
  }

  const oldValue = intersectionPointsData1.y;

  intersectionPointsData1.y = value;

  if (oldValue !== null && oldValue !== value) {
     pruneUnusedTick('y', oldValue);
  }

  addTickY(value);

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});
  
$('reset-intersection-x').addEventListener('click', () => {
  const oldValue = intersectionPointsData1.x;

  intersectionPointsData1.x = null;
  if (oldValue !== null) pruneUnusedTick('x', oldValue);
  clearInput('intersection-x-value');

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});

$('reset-intersection-y').addEventListener('click', () => {
  const oldValue = intersectionPointsData1.y;

  intersectionPointsData1.y = null;
  if (oldValue !== null) pruneUnusedTick('y', oldValue);
  clearInput('intersection-y-value');

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});
 
$('add-intersection-x-2').addEventListener('click', () => {
  const value = getNumberFromInput('intersection-x-value-2');

  if (valueToGridX(value) === null) {
    alert('Verifică scara OX și valoarea intersecției.');
    return;
  }

const oldValue = intersectionPointsData2.x;

intersectionPointsData2.x = value;

if (oldValue !== null && oldValue !== value) {
  pruneUnusedTick('x', oldValue);
}

addTickX(value);

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});

$('add-intersection-y-2').addEventListener('click', () => {
  const value = getNumberFromInput('intersection-y-value-2');

  if (valueToGridY(value) === null) {
    alert('Verifică scara OY și valoarea intersecției.');
    return;
  }

const oldValue = intersectionPointsData2.y;

intersectionPointsData2.y = value;

if (oldValue !== null && oldValue !== value) {
  pruneUnusedTick('y', oldValue);
}

addTickY(value);

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});

$('reset-intersection-x-2').addEventListener('click', () => {
  const oldValue = intersectionPointsData2.x;

  intersectionPointsData2.x = null;
  if (oldValue !== null) pruneUnusedTick('x', oldValue);
  clearInput('intersection-x-value-2');

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});

$('reset-intersection-y-2').addEventListener('click', () => {
 const oldValue = intersectionPointsData2.y;

 intersectionPointsData2.y = null;
 if (oldValue !== null) pruneUnusedTick('y', oldValue);
 clearInput('intersection-y-value-2');

  refreshTicks();
  refreshScaleStepLabels();
  redrawAllSpecialPoints();
});
// aici se termină al doilea buton de intersecții cu axele

  $('activate-trendline-1').addEventListener('click', () => {
    resetTrendline(2);
    resetTrendline(3);

    if (!trendlineStates[1].isVisible || !trendlineStates[1].p1 || !trendlineStates[1].p2) {
      createDefaultTrendline(1);
    } else {
      trendlineStates[1].isFixed = false;
    }

    renderTrendline(1);
  });

  $('fix-trendline-1').addEventListener('click', () => {
    if (!trendlineStates[1].isVisible) return;

    trendlineStates[1].isFixed = true;
    trendlineStates[1].dragMode = null;
    trendlineStates[1].pointerId = null;
    trendlineStates[1].lastPoint = null;

    renderTrendline(1);
  });

  $('reset-trendline-1').addEventListener('click', () => {
    resetTrendline(1);
    resetTrendline(2);
    resetTrendline(3);
  });
    $('activate-trendline-4').addEventListener('click', () => {
    resetTrendline(5);
    resetTrendline(6);

    if (!trendlineStates[4].isVisible || !trendlineStates[4].p1 || !trendlineStates[4].p2) {
      createDefaultTrendline(4);
    } else {
      trendlineStates[4].isFixed = false;
    }

    renderTrendline(4);
  });

  $('fix-trendline-4').addEventListener('click', () => {
    if (!trendlineStates[4].isVisible) return;

    trendlineStates[4].isFixed = true;
    trendlineStates[4].dragMode = null;
    trendlineStates[4].pointerId = null;
    trendlineStates[4].lastPoint = null;

    renderTrendline(4);
  });

  $('reset-trendline-4').addEventListener('click', () => {
    resetTrendline(4);
    resetTrendline(5);
    resetTrendline(6);
  });

  $('activate-extensions-2').addEventListener('click', () => {
    if (!trendlineStates[5].isVisible || !trendlineStates[6].isVisible) {
      const ok5 = createExtensionFromTrendline(5);
      const ok6 = createExtensionFromTrendline(6);
      if (!ok5 || !ok6) return;
    } else {
      trendlineStates[5].isFixed = false;
      trendlineStates[6].isFixed = false;
      renderTrendline(5);
      renderTrendline(6);
    }

    updateExtensionButtons();
  });

  $('fix-extensions-2').addEventListener('click', () => {
    [5, 6].forEach((index) => {
      if (!trendlineStates[index].isVisible) return;

      trendlineStates[index].isFixed = true;
      trendlineStates[index].dragMode = null;
      trendlineStates[index].pointerId = null;
      trendlineStates[index].lastPoint = null;

      renderTrendline(index);
    });

    updateExtensionButtons();
  });

  $('reset-extensions-2').addEventListener('click', () => {
    resetTrendline(5);
    resetTrendline(6);
  });



  $('activate-extensions').addEventListener('click', () => {
    if (!trendlineStates[2].isVisible || !trendlineStates[3].isVisible) {
      const ok2 = createExtensionFromTrendline(2);
      const ok3 = createExtensionFromTrendline(3);
      if (!ok2 || !ok3) return;
    } else {
      trendlineStates[2].isFixed = false;
      trendlineStates[3].isFixed = false;
      renderTrendline(2);
      renderTrendline(3);
    }

    updateExtensionButtons();
  });

  $('fix-extensions').addEventListener('click', () => {
    [2, 3].forEach((index) => {
      if (!trendlineStates[index].isVisible) return;

      trendlineStates[index].isFixed = true;
      trendlineStates[index].dragMode = null;
      trendlineStates[index].pointerId = null;
      trendlineStates[index].lastPoint = null;

      renderTrendline(index);
    });

    updateExtensionButtons();
  });

  $('reset-extensions').addEventListener('click', () => {
    resetTrendline(2);
    resetTrendline(3);
  });

  $('activate-curveline').addEventListener('click', () => {
    if (!curveLineState.isVisible || curveLineState.points.length < 2) {
      createDefaultCurveLine();
    } else {
      curveLineState.isFixed = false;
    }

    renderCurveLine();
  });

  $('fix-curveline').addEventListener('click', () => {
    if (!curveLineState.isVisible) return;

    curveLineState.isFixed = true;
    curveLineState.dragIndex = null;
    curveLineState.pointerId = null;

    renderCurveLine();
  });

  $('reset-curveline').addEventListener('click', resetCurveLine);

  $('axis-label-input-x').addEventListener('input', (e) => {
    axisLabels.x = e.target.value;
    $('axis-label-x').textContent = axisLabels.x;
  });

  $('axis-label-input-y').addEventListener('input', (e) => {
    axisLabels.y = e.target.value;
    $('axis-label-y').textContent = axisLabels.y;
  });

  $('save-work').addEventListener('click', saveWork);

  $('load-work-btn').addEventListener('click', () => {
    $('load-work-input').click();
  });

  $('load-work-input').addEventListener('change', loadWorkFromFile);

 // Listenerul pentru Butonul de preview grafic

$('preview-graph').addEventListener('click', () => {
  const button = $('preview-graph');

  if (button.classList.contains('is-launching')) return;

  button.classList.add('is-launching');

  setTimeout(() => {
    document.body.classList.add('preview-mode');
    button.classList.remove('is-launching');
  }, 1450);
});

 // Exit preview
  $('exit-preview').addEventListener('click', () => {
  document.body.classList.remove('preview-mode');
  });
}

function setupPointerEvents() {
  svg.addEventListener('pointerdown', (evt) => {
    const role = evt.target.dataset.role;

    if (role === 'curve-handle') {
      if (curveLineState.isFixed) return;

      evt.preventDefault();
      curveLineState.dragIndex = Number(evt.target.dataset.index);
      curveLineState.pointerId = evt.pointerId;
      svg.setPointerCapture(evt.pointerId);
      return;
    }

    const trendlineIndex = parseInt(evt.target.dataset.trendline, 10);

    if (!role || !trendlineIndex || !trendlineStates[trendlineIndex] || trendlineStates[trendlineIndex].isFixed) return;
    if (trendlineIndex !== 1 && trendlineIndex !== 4 && role !== 'handle2') return;

    const state = trendlineStates[trendlineIndex];
    if (!state.isVisible) return;

    evt.preventDefault();
    state.dragMode = role;
    state.pointerId = evt.pointerId;
    state.lastPoint = clampPointToGrid(getSvgPoint(evt));
    svg.setPointerCapture(evt.pointerId);
  });

  svg.addEventListener('pointermove', (evt) => {
    if (curveLineState.pointerId === evt.pointerId && curveLineState.dragIndex !== null) {
      evt.preventDefault();

      const currentPoint = clampAndSnapPoint(getSvgPoint(evt));
      curveLineState.points[curveLineState.dragIndex] = currentPoint;
      renderCurveLine();
      markDirty();
      return;
    }

    for (const index of [1, 2, 3, 4, 5, 6]) {
      const state = trendlineStates[index];

      if (state.pointerId !== evt.pointerId || !state.dragMode || state.isFixed) continue;

      evt.preventDefault();
      const currentPoint = clampPointToGrid(getSvgPoint(evt));

      if (state.dragMode === 'handle1' && (index === 1 || index === 4)) {
        state.p1 = currentPoint;
      } else if (state.dragMode === 'handle2') {
        state.p2 = currentPoint;
      } else if (state.dragMode === 'line' && (index === 1 || index === 4)) {
        const rawDx = currentPoint.x - state.lastPoint.x;
        const rawDy = currentPoint.y - state.lastPoint.y;

        const minDx = x0 - Math.min(state.p1.x, state.p2.x);
        const maxDx = (x0 + gridWidth) - Math.max(state.p1.x, state.p2.x);
        const minDy = (y0 - gridHeight) - Math.min(state.p1.y, state.p2.y);
        const maxDy = y0 - Math.max(state.p1.y, state.p2.y);

        const dx = clamp(rawDx, minDx, maxDx);
        const dy = clamp(rawDy, minDy, maxDy);

        state.p1 = { x: state.p1.x + dx, y: state.p1.y + dy };
        state.p2 = { x: state.p2.x + dx, y: state.p2.y + dy };
        state.lastPoint = { x: state.lastPoint.x + dx, y: state.lastPoint.y + dy };
      }

      renderTrendline(index);
      markDirty();
    }
  });

  function stopDrag(evt) {
    if (curveLineState.pointerId === evt.pointerId) {
      curveLineState.dragIndex = null;
      curveLineState.pointerId = null;
    }

    for (const index of [1, 2, 3, 4, 5, 6]) {
      const state = trendlineStates[index];

      if (state.pointerId !== evt.pointerId) continue;

      state.dragMode = null;
      state.pointerId = null;
      state.lastPoint = null;
    }

    if (svg.hasPointerCapture(evt.pointerId)) svg.releasePointerCapture(evt.pointerId);
  }

  svg.addEventListener('pointerup', stopDrag);
  svg.addEventListener('pointercancel', stopDrag);

  svg.addEventListener('pointerdown', () => markDirty(), true);
}

function setupDirtyEvents() {
  /* Detectează scrierea în inputuri */
  $('controls').addEventListener('input', (e) => {
    if (e.target.id === 'load-work-input') return;
    markDirty();
  }, true);

  /* Detectează apăsarea butoanelor */
  $('controls').addEventListener('click', (e) => {
    const button = e.target.closest('button');

    if (
      [
        'save-work',
        'load-work-btn',
        'activate-magnifier',
        'deactivate-magnifier'
      ].includes(button?.id)
    ) {
      return;
    }

    markDirty();
  }, true);
}

/* Ascunde fereastra lupei */
function hideMagnifierLens() {
  if (!magnifierLens) return;

  magnifierLens.hidden = true;
  magnifierLens.setAttribute('aria-hidden', 'true');
}

/* Transformă o poziție SVG într-o poziție din a4-container */
function svgPointToContainer(x, y) {
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;

  const screenPoint = point.matrixTransform(svg.getScreenCTM());
  const containerRect = $('a4-container').getBoundingClientRect();

  return {
    x: screenPoint.x - containerRect.left,
    y: screenPoint.y - containerRect.top
  };
}

/* Afișează lupa pentru axa și poziția selectată */
function showMagnifierAt(axis, svgX, svgY) {
  const longHalf = MAGNIFIER_SOURCE_LONG / 2;
  const shortHalf = MAGNIFIER_SOURCE_SHORT / 2;

  let centerX;
  let centerY;
  let sourceMinX;
  let sourceMinY;
  let sourceWidth;
  let sourceHeight;

  if (axis === 'x') {
    /* Pe OX se modifică numai poziția stânga-dreapta */
    centerX = clamp(
      svgX,
      x0 + longHalf,
      x0 + gridWidth - longHalf
    );

    centerY = y0;

    sourceMinX = centerX - longHalf;
    sourceMinY = centerY - shortHalf;
    sourceWidth = MAGNIFIER_SOURCE_LONG;
    sourceHeight = MAGNIFIER_SOURCE_SHORT;
  } else {
    /* Pe OY se modifică numai poziția sus-jos */
    centerX = originX;

    centerY = clamp(
      svgY,
      y0 - gridHeight + longHalf,
      y0 - longHalf
    );

    sourceMinX = centerX - shortHalf;
    sourceMinY = centerY - longHalf;
    sourceWidth = MAGNIFIER_SOURCE_SHORT;
    sourceHeight = MAGNIFIER_SOURCE_LONG;
  }

  /* Alegem forma orizontală sau verticală */
  magnifierLens.classList.toggle('is-x', axis === 'x');
  magnifierLens.classList.toggle('is-y', axis === 'y');

  /* Trebuie afișată înainte să-i putem măsura dimensiunea */
  magnifierLens.hidden = false;
  magnifierLens.setAttribute('aria-hidden', 'false');
  renderMagnifierContent(sourceMinX, sourceMinY, sourceWidth, sourceHeight);

  const containerRect = $('a4-container').getBoundingClientRect();
  const lensWidth = magnifierLens.offsetWidth;
  const lensHeight = magnifierLens.offsetHeight;

  let left;
  let top;

  if (axis === 'x') {
    /*
      Lupa OX este centrată pe valoarea apăsată.
      Partea de jos nu trece sub zona actuală a etichetelor.
    */
    const anchor = svgPointToContainer(centerX, y0 + 7);

    left = clamp(
      anchor.x - lensWidth / 2,
      0,
      containerRect.width - lensWidth
    );

    top = clamp(
      anchor.y - lensHeight,
      0,
      containerRect.height - lensHeight
    );
  } else {
    /*
      Lupa OY apare în dreapta axei și este centrată
      vertical pe valoarea apăsată.
    */
    const anchor = svgPointToContainer(originX, centerY);

    left = clamp(
      anchor.x + 8,
      0,
      containerRect.width - lensWidth
    );

    top = clamp(
      anchor.y - lensHeight / 2,
      0,
      containerRect.height - lensHeight
    );
  }

  magnifierLens.style.left = left + 'px';
  magnifierLens.style.top = top + 'px';
}

/* Creează zonele largi de click/tap din jurul axelor */
function setupMagnifierEngine() {
  magnifierSensorsGroup = $('magnifier-sensors');
  magnifierLens = $('magnifier-lens');
  magnifierSvg = $('magnifier-svg');
  magnifierExtraLabels = $('magnifier-extra-labels');

  magnifierSensorsGroup.innerHTML = '';

  function createAxisSensor(axis) {
    const sensor = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    );

    if (axis === 'x') {
      /* Bandă lată în jurul axei OX */
      sensor.setAttribute('x', x0);
      sensor.setAttribute('y', y0 - 8);
      sensor.setAttribute('width', gridWidth);
      sensor.setAttribute('height', 18);
    } else {
      /* Bandă lată în jurul axei OY */
      sensor.setAttribute('x', originX - 9);
      sensor.setAttribute('y', y0 - gridHeight);
      sensor.setAttribute('width', 18);
      sensor.setAttribute('height', gridHeight);
    }

    sensor.setAttribute('fill', 'transparent');
    sensor.setAttribute('pointer-events', 'all');
    sensor.style.cursor = 'zoom-in';

    /*
      Oprim evenimentele înainte să ajungă la instrumentele
      care desenează sau mută liniile pe grafic.
    */
    sensor.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    sensor.addEventListener('pointerup', (event) => {
      event.stopPropagation();
    });

    sensor.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!magnifierActive) return;

      const point = getSvgPoint(event);

      showMagnifierAt(axis, point.x, point.y);

      /* Instrucțiunea nu mai este necesară după primul click valid */
      $('magnifier-tip').hidden = true;
    });

    magnifierSensorsGroup.appendChild(sensor);
  }

  createAxisSensor('x');
  createAxisSensor('y');

  /* La pornirea aplicației, senzorii nu interceptează nimic */
  magnifierSensorsGroup.setAttribute('pointer-events', 'none');
  hideMagnifierLens();
}

// Funcția pt starea de magnifier și off
function setupMagnifierControls() {
  const activateButton = $('activate-magnifier');
  const deactivateButton = $('deactivate-magnifier');
  const magnifierTip = $('magnifier-tip');

  function setMagnifierActive(isActive) {
    magnifierActive = isActive;

    activateButton.setAttribute(
      'aria-pressed',
      isActive ? 'true' : 'false'
    );

    deactivateButton.disabled = !isActive;
    magnifierTip.hidden = !isActive;

    magnifierSensorsGroup.setAttribute(
        'pointer-events',
        isActive ? 'all' : 'none'
      );

      if (!isActive) {
        hideMagnifierLens();
      }
  }

  activateButton.addEventListener('click', () => {
    setMagnifierActive(true);
  });

  deactivateButton.addEventListener('click', () => {
    setMagnifierActive(false);
  });

  setMagnifierActive(false);
}

function init() {
  svg = $('graph');
  tickContainer = $('tick-container');
  tickMarksGroup = $('tick-marks');
  scaleStepMarksGroup = $('scale-step-marks');
  experimentalPointsGroup = $('experimental-points');
  slopePointsGroup = $('slope-points');
  intersectionPointsGroup = $('intersection-points');

  initTrendlineConfigs();

  drawGrid();
  drawAxes();
  refreshTicks();
  refreshScaleStepLabels();

  $('axis-label-input-x').value = axisLabels.x;
  $('axis-label-input-y').value = axisLabels.y;
  $('axis-label-x').textContent = axisLabels.x;
  $('axis-label-y').textContent = axisLabels.y;

  updateTrendlineButtons(1);
  updateTrendlineButtons(2);
  updateTrendlineButtons(3);
  updateTrendlineButtons(4);
  updateTrendlineButtons(5);
  updateTrendlineButtons(6);
  updateExtensionButtons();
  updateCurveLineButtons();

  setupInputEvents();
  setupPointerEvents();
  setupDirtyEvents();

  setupMagnifierEngine();
  setupMagnifierControls();

  markSaved();
}

window.addEventListener('load', init);

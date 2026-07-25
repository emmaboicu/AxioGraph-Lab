
/* ================================
MOTORUL LUPEI 
=====================================================================*/

import {
  x0,
  y0,
  originX,
  gridWidth,
  gridHeight,
  gridFineStroke,
  gridMediumStroke,
  gridMajorStroke,
  axisStroke
} from './sheet.js';

const MAGNIFIER_SPECIAL_TEXT_SIZE = 3.4;

function isOriginValue(value) {
  return Math.abs(Number(value)) < 1e-9;
}


/* Raportul dintre unitățile SVG și pixelii afișați în Normal View */

function getNormalSvgPixelScale(svg) {
  const graphRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  if (!graphRect.width || !viewBox.width) return 1;

  return graphRect.width / viewBox.width;
}


/* Creează o linie în Axis Detail View */
function createMagnifierLine(
  x1,
  y1,
  x2,
  y2,
  color,
  strokeWidth
) {
  const line = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  );

  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', strokeWidth);

  return line;
}

/* Creează o valoare colorată, păstrată la dimensiunea din Normal View */
function createMagnifierText(
  textValue,
  x,
  y,
  anchor,
  color,
  normalScale,
  size = MAGNIFIER_SPECIAL_TEXT_SIZE
) {
  const text = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'text'
  );

  text.textContent = textValue;
  text.setAttribute('x', x);
  text.setAttribute('y', y);
  text.setAttribute('text-anchor', anchor);
  text.setAttribute(
    'font-size',
     size * normalScale
  );
  text.setAttribute('font-family', 'Poppins, Arial, sans-serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', color);
  text.setAttribute('stroke', '#ffffff');
  text.setAttribute('stroke-width', 0.35 * normalScale);
  text.setAttribute('paint-order', 'stroke');
  text.setAttribute('pointer-events', 'none');

  return text;
}
/* Păstrează cele trei grosimi ale foii milimetrice */
function getMagnifierGridStroke(index, normalScale) {
  const baseStroke =
    index % 10 === 0
      ? gridMajorStroke
      : index % 5 === 0
        ? gridMediumStroke
        : gridFineStroke;

  return baseStroke * normalScale;
}

/* Desenează numai porțiunea locală de foaie milimetrică */
function renderMagnifierGrid(
  group,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight,
  mapPoint,
  normalScale
) {
  const xStart = Math.max(x0, Math.ceil(sourceMinX));
  const xEnd = Math.min(
    x0 + gridWidth,
    Math.floor(sourceMinX + sourceWidth)
  );

  const yStart = Math.max(
    y0 - gridHeight,
    Math.ceil(sourceMinY)
  );
  const yEnd = Math.min(
    y0,
    Math.floor(sourceMinY + sourceHeight)
  );

  /* Liniile verticale */
  for (let x = xStart; x <= xEnd; x++) {
    const top = mapPoint(x, yStart);
    const bottom = mapPoint(x, yEnd);
    const gridIndex = Math.round(x - x0);

    group.appendChild(
      createMagnifierLine(
        top.x,
        top.y,
        bottom.x,
        bottom.y,
        '#4fc8fc',
        getMagnifierGridStroke(gridIndex, normalScale)
      )
    );
  }

  /* Liniile orizontale */
  for (let y = yStart; y <= yEnd; y++) {
    const left = mapPoint(xStart, y);
    const right = mapPoint(xEnd, y);
    const gridIndex = Math.round(y0 - y);

    group.appendChild(
      createMagnifierLine(
        left.x,
        left.y,
        right.x,
        right.y,
        '#4fc8fc',
        getMagnifierGridStroke(gridIndex, normalScale)
      )
    );
  }
}

/* Desenează numai axa pe care a fost activat Detail View */
function renderMagnifierSelectedAxis(
  group,
  axis,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight,
  mapPoint,
  normalScale
) {
  if (axis === 'x') {
    const start = mapPoint(sourceMinX, y0);
    const end = mapPoint(sourceMinX + sourceWidth, y0);

    group.appendChild(
      createMagnifierLine(
        start.x,
        start.y,
        end.x,
        end.y,
        '#00008B',
        axisStroke * normalScale
      )
    );

    return;
  }

    const axisStartY = Math.max(
      sourceMinY,
      y0 - gridHeight
    );

    const axisEndY = Math.min(
      sourceMinY + sourceHeight,
      y0
    );

    const start = mapPoint(originX, axisStartY);
    const end = mapPoint(originX, axisEndY);

  group.appendChild(
    createMagnifierLine(
      start.x,
      start.y,
      end.x,
      end.y,
      '#00008B',
      axisStroke * normalScale
    )
  );
}

/* Desenează intersecția axelor și originea O când intră în lupă */
function renderMagnifierOrigin(
  group,
  axis,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight,
  mapPoint,
  normalScale
) {
  const sourceMaxX = sourceMinX + sourceWidth;
  const sourceMaxY = sourceMinY + sourceHeight;

  const containsOrigin =
    originX >= sourceMinX &&
    originX <= sourceMaxX &&
    y0 >= sourceMinY &&
    y0 <= sourceMaxY;

  if (!containsOrigin) return;

  const origin = mapPoint(originX, y0);

  if (axis === 'x') {
    const top = mapPoint(
      originX,
      Math.max(sourceMinY, y0 - gridHeight)
    );

    group.appendChild(
      createMagnifierLine(
        origin.x,
        top.y,
        origin.x,
        origin.y,
        '#00008B',
        axisStroke * normalScale
      )
    );
  } else {
    const left = mapPoint(
      Math.max(sourceMinX, x0),
      y0
    );

    const right = mapPoint(
      Math.min(sourceMaxX, x0 + gridWidth),
      y0
    );

    group.appendChild(
      createMagnifierLine(
        left.x,
        origin.y,
        right.x,
        origin.y,
        '#00008B',
        axisStroke * normalScale
      )
    );
  }

  group.appendChild(
    createMagnifierText(
      'O',
      origin.x,
      origin.y + 7 * normalScale,
      'middle',
      '#00008B',
      normalScale,
      6
    )
  );
}

/* Desenează un tick special și valoarea lui colorată */
function appendMagnifierSpecialValue(
  group,
  axis,
  value,
  coord,
  color,
  mapPoint,
  normalScale,
  pointX = null
) {
  if (isOriginValue(value)) return;

  if (axis === 'x') {
    const tickCenter = mapPoint(coord, y0);
    const tickHalf = 1.5 * normalScale;

    group.appendChild(
      createMagnifierLine(
        tickCenter.x,
        tickCenter.y - tickHalf,
        tickCenter.x,
        tickCenter.y + tickHalf,
        color,
        0.45 * normalScale
      )
    );

    group.appendChild(
      createMagnifierText(
        value,
        tickCenter.x,
        tickCenter.y + 5 * normalScale,
        'middle',
        color,
        normalScale
      )
    );

    return;
  }

  const labelOnRight =
    pointX !== null && pointX < originX;

  const tickCenter = mapPoint(originX, coord);
  const tickHalf = 1.5 * normalScale;
  const labelX = labelOnRight
    ? tickCenter.x + 2.2 * normalScale
    : tickCenter.x - 2.2 * normalScale;

  group.appendChild(
    createMagnifierLine(
      tickCenter.x - tickHalf,
      tickCenter.y,
      tickCenter.x + tickHalf,
      tickCenter.y,
      color,
      0.45 * normalScale
    )
  );

  group.appendChild(
    createMagnifierText(
      value,
      labelX,
      tickCenter.y + 1.2 * normalScale,
      labelOnRight ? 'start' : 'end',
      color,
      normalScale
    )
  );
}

/* Adună valorile speciale ale axei, fără dubluri */
function getMagnifierAxisValues(axis, context) {
  const {
    intersectionPointsData1,
    intersectionPointsData2,
    experimentalPointsData,
    slopePointsData,
    slopePointsData2,
    valueToGridX,
    valueToGridY,
    valuesToSvgPoint
  } = context;
  const items = [];

  function addValue(value, color, pointX = null) {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return;
    }

    const alreadyExists = items.some(
      (item) =>
        Math.abs(Number(item.value) - Number(value)) < 1e-6
    );

    if (alreadyExists) return;

    const coord =
      axis === 'x'
        ? valueToGridX(value)
        : valueToGridY(value);

    if (coord === null) return;

    items.push({
      value,
      coord,
      color,
      pointX
    });
  }

  /* Prioritatea 1: Intercepts */
  [intersectionPointsData1, intersectionPointsData2]
    .forEach((data) => {
      addValue(
        axis === 'x' ? data.x : data.y,
        '#9f1ef5'
      );
    });

  /* Prioritatea 2: Experimental Points */
  experimentalPointsData.forEach((pointData) => {
    const point = valuesToSvgPoint(
      pointData.x,
      pointData.y
    );

    if (!point) return;

    addValue(
      axis === 'x' ? pointData.x : pointData.y,
      '#f63fcb',
      point.x
    );
  });

  /* Prioritatea 3: Slope Points */
  [...slopePointsData, ...slopePointsData2]
    .forEach((pointData) => {
      if (!pointData) return;

      const point = valuesToSvgPoint(
        pointData.x,
        pointData.y
      );

      if (!point) return;

      addValue(
        axis === 'x' ? pointData.x : pointData.y,
        '#f06216',
        point.x
      );
    });

  return items;
}

/* Desenează toate valorile speciale ale axei selectate */
function renderMagnifierAxisValues(
  group,
  axis,
  mapPoint,
  normalScale,
  context
) {
  const items = getMagnifierAxisValues(axis, context);

  items.forEach((item) => {
    appendMagnifierSpecialValue(
      group,
      axis,
      item.value,
      item.coord,
      item.color,
      mapPoint,
      normalScale,
      item.pointX
    );
  });
}

/* Construiește conținutul complet al Axis Detail View */
export function renderAxisMagnifier(context) {
  const {
    axis,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    svg,
    magnifierLens,
    magnifierSvg
  } = context;

  const lensWidth = magnifierLens.offsetWidth;
  const lensHeight = magnifierLens.offsetHeight;

  const magnifierScale = Math.min(
    lensWidth / sourceWidth,
    lensHeight / sourceHeight
  );

  const normalScale = getNormalSvgPixelScale(svg);

  const contentWidth = sourceWidth * magnifierScale;
  const contentHeight = sourceHeight * magnifierScale;

  const offsetX = (lensWidth - contentWidth) / 2;
  const offsetY = (lensHeight - contentHeight) / 2;

  magnifierSvg.setAttribute(
    'viewBox',
    `0 0 ${lensWidth} ${lensHeight}`
  );

  magnifierSvg.innerHTML = `
    <rect
      class="magnifier-background"
      x="0"
      y="0"
      width="100%"
      height="100%"
    ></rect>
  `;

  const contentGroup = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'g'
  );

  const defs = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'defs'
  );

  const clipPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'clipPath'
  );

  const clipRect = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  );

  clipPath.setAttribute(
    'id',
    'magnifier-axis-clip'
  );

  clipRect.setAttribute('x', offsetX);
  clipRect.setAttribute('y', offsetY);
  clipRect.setAttribute('width', contentWidth);
  clipRect.setAttribute('height', contentHeight);

  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);
  magnifierSvg.appendChild(defs);

  contentGroup.setAttribute(
    'clip-path',
    'url(#magnifier-axis-clip)'
  );

  magnifierSvg.appendChild(contentGroup);

  /* Transformă o coordonată din grafic în coordonata din lupă */
  const mapPoint = (x, y) => ({
    x: offsetX + (x - sourceMinX) * magnifierScale,
    y: offsetY + (y - sourceMinY) * magnifierScale
  });

  renderMagnifierGrid(
    contentGroup,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    mapPoint,
    normalScale
  );

  renderMagnifierSelectedAxis(
    contentGroup,
    axis,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    mapPoint,
    normalScale
  );

  renderMagnifierOrigin(
  contentGroup,
  axis,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight,
  mapPoint,
  normalScale
);

  renderMagnifierAxisValues(
    contentGroup,
    axis,
    mapPoint,
    normalScale,
    context
  );
}

/* ===========================----------------------==================*/
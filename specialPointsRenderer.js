import {
  y0,
  originX
} from './sheet.js';

import {
  AXIS_LABEL_PRIORITY,
  addAxisMarker as queueSpecialAxisMarker
} from './axisLabelLayout.js';


/*=============================================================
  Desenează punctul experimental și îl aliniază la cea mai
  apropiată linie a grilei, conform scării curente.
  Trasează ghidajele și pregătește valorile pentru afișarea pe axe.
===============================================================*/

export function drawExperimentalPoint(
  valueX,
  valueY,
  valuesToSvgPoint,
  coordGuideStroke,
  experimentalPointsGroup
) {

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
    line.setAttribute(
      'stroke',
      'rgba(20, 20, 173, 0.8)'
    );
    line.setAttribute('stroke-width', coordGuideStroke);
    line.setAttribute('stroke-dasharray', '1,1.2');
    return line;
  };

  pointGroup.appendChild(createGuideLine(x, y0, x, y));
  pointGroup.appendChild(createGuideLine(originX, y, x, y));

  const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  point.setAttribute('cx', x);
  point.setAttribute('cy', y);
  point.setAttribute('r', 0.6);
  point.setAttribute('fill', 'rgba(224, 17, 157,1)' );
  pointGroup.appendChild(point);

  queueSpecialAxisMarker({
      group: pointGroup,
      axis: 'x',
      coord: x,
      label: valueX,
      color: 'rgba(214, 20, 117, 0.8)',
      priority: AXIS_LABEL_PRIORITY.experimental
  });

  queueSpecialAxisMarker({
      group: pointGroup,
      axis: 'y',
      coord: y,
      label: valueY,
      color: 'rgba(214, 20, 117, 0.8)',
      priority: AXIS_LABEL_PRIORITY.experimental,
      pointX: x
  });

  experimentalPointsGroup.appendChild(pointGroup);
}
/* ===============================================================*/

/*=======================================================================
  Desenează un punct de pantă, ghidajele și eticheta lui,
  apoi pregătește valorile coordonatelor pentru afișarea pe axe.
==========================================================================*/

export function drawSlopePoint(
  pointData,
  label,
  valuesToSvgPoint,
  slopePointsGroup
) {

  const point = valuesToSvgPoint(pointData.x, pointData.y);
  if (!point) return;

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  const guideV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  guideV.setAttribute('x1', point.x);
  guideV.setAttribute('y1', y0);
  guideV.setAttribute('x2', point.x);
  guideV.setAttribute('y2', point.y);
  guideV.setAttribute('stroke', '#ff4310');
  guideV.setAttribute('stroke-width', 0.25);
  guideV.setAttribute('stroke-dasharray', '2,2');
  group.appendChild(guideV);

  const guideH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  guideH.setAttribute('x1', originX);
  guideH.setAttribute('y1', point.y);
  guideH.setAttribute('x2', point.x);
  guideH.setAttribute('y2', point.y);
  guideH.setAttribute('stroke', '#ff4310');
  guideH.setAttribute('stroke-width', 0.25);
  guideH.setAttribute('stroke-dasharray', '2,2');
  group.appendChild(guideH);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 1);
  circle.setAttribute('fill', '#ff4310');
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', 0.35);
  group.appendChild(circle);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.textContent = label + '(' + pointData.x + '; ' + pointData.y + ')';
  text.setAttribute('x', point.x + 2.2);
  text.setAttribute('y', point.y - 2.2);
  text.setAttribute('font-size', '4.4');
  text.setAttribute('font-family', '"Barlow Condensed", Poppins, Arial, sans-serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('letter-spacing', '0.4px');
  text.setAttribute('fill', '#ff4310');
  group.appendChild(text);
 
  queueSpecialAxisMarker({
    group,
    axis: 'x',
    coord: point.x,
    label: pointData.x,
    color: '#ff3700',
    priority: AXIS_LABEL_PRIORITY.slope
  });

queueSpecialAxisMarker({
    group,
    axis: 'y',
    coord: point.y,
    label: pointData.y,
    color: '#ff3700',
    priority: AXIS_LABEL_PRIORITY.slope,
    pointX: point.x
  });

  slopePointsGroup.appendChild(group);
}

/*==================================================================================
  Desenează o intersecție cu axa corespunzătoare
  și pregătește valoarea pentru afișarea pe acea axă.
==================================================================================*/
export function drawIntersectionPoint(
  kind,
  value,
  valueToGridX,
  valueToGridY,
  intersectionPointsGroup
) {
  let point = null;

  if (kind === 'x') {
    const x = valueToGridX(value);
    if (x === null) return;

    point = {
      x,
      y: y0
    };
  }

  if (kind === 'y') {
    const y = valueToGridY(value);
    if (y === null) return;

    point = {
      x: originX,
      y
    };
  }

  if (!point) return;

  const group = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'g'
  );

  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  );

  circle.setAttribute('cx', point.x);
  circle.setAttribute('cy', point.y);
  circle.setAttribute('r', 0.8);
  circle.setAttribute('fill', 'rgba(43, 2, 81, 0.9)');
  circle.setAttribute('stroke', 'none');

  group.appendChild(circle);

  if (kind === 'x') {
    queueSpecialAxisMarker({
      group,
      axis: 'x',
      coord: point.x,
      label: value,
      color: 'rgba(106, 27, 154, 0.9)',
      priority: AXIS_LABEL_PRIORITY.intercept
    });
  }

  if (kind === 'y') {
    queueSpecialAxisMarker({
      group,
      axis: 'y',
      coord: point.y,
      label: value,
      color: 'rgba(106, 27, 154, 0.9)',
      priority: AXIS_LABEL_PRIORITY.intercept
    });
  }

  intersectionPointsGroup.appendChild(group);
}
import {
  y0,
  originX
} from './sheet.js';


/* ==================================================
   PRIORITĂȚILE VALORILOR AFIȘATE DE PE AXE
   ================================================== */

export const AXIS_LABEL_PRIORITY = {
  step: 1,
  slope: 2,
  experimental: 3,
  intercept: 4
};


/* Valorile care urmează să fie analizate și afișate */
const axisMarkerCandidates = [];


/* Golește lista înaintea unei redesenări complete */
export function resetAxisLabelLayout() {
  axisMarkerCandidates.length = 0;
}


/* =========================================================
   COMPARAȚII GEOMETRICE INTRE VALORILE ȘI TICKURILE AFIȘATE
   ========================================================= */

/* Verifică dacă două texte se suprapun */
function axisLabelBoxesOverlap(
  firstBox,
  secondBox,
  gap = 0.6
) {
  return !(
    firstBox.x + firstBox.width + gap <= secondBox.x ||
    secondBox.x + secondBox.width + gap <= firstBox.x ||
    firstBox.y + firstBox.height + gap <= secondBox.y ||
    secondBox.y + secondBox.height + gap <= firstBox.y
  );
}


/* Verifică dacă două tickuri se suprapun */
function axisTicksOverlap(firstTick, secondTick) {
  const maximumDistance =
    (firstTick.strokeWidth + secondTick.strokeWidth) / 2;

  return (
    Math.abs(firstTick.coord - secondTick.coord) <=
    maximumDistance
  );
}


/* ==================================================
   COLECTAREA CANDIDAȚILOR (VALOARE ȘI TICK)
   ================================================== */

/*
  Primește un text și un tick deja construite.
  Nu le afișează încă; doar le pune în lista de analizat.
*/
export function queueAxisMarker({
  group,
  axis,
  coord,
  text,
  tick,
  alternateText = null,
  priority
}) {
  axisMarkerCandidates.push({
    group,
    axis,
    coord,
    text,
    alternateText,
    tick,
    priority
  });
}


/* =====================================================
   CONSTRUIREA MARCAJELOR SPECIALE (VALOARE+TICK) PE AXE
   ===================================================== */

export function addAxisMarker({
  group,
  axis,
  coord,
  label,
  color,
  priority,
  pointX = null
}) {
  /* Originea este gestionată separat */
  if (Math.abs(Number(label)) < 1e-9) return;

  const tick = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  );

  const text = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'text'
  );

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

    const labelOnRight =
      pointX !== null && pointX < originX;

    text.setAttribute(
      'x',
      labelOnRight ? originX + 2.2 : originX - 2.2
    );

    text.setAttribute('y', coord + 1.2);

    text.setAttribute(
      'text-anchor',
      labelOnRight ? 'start' : 'end'
    );
  }

  tick.setAttribute('stroke', color);
  tick.setAttribute('stroke-width', 0.25);

  text.textContent = label;
  text.setAttribute('data-axis', axis);
  text.setAttribute('font-size', '3.4');
  text.setAttribute(
    'font-family',
    '"Barlow Condensed", Arial, sans-serif'
  );
  text.setAttribute('font-weight', '700');
  text.setAttribute('fill', color);
  text.setAttribute('stroke', '#ffffff');
  text.setAttribute('stroke-width', '0.35');
  text.setAttribute('paint-order', 'stroke');
  text.setAttribute('pointer-events', 'none');

  queueAxisMarker({
    group,
    axis,
    coord,
    text,
    tick,
    priority
  });
}


/* ====================================================
   ANALIZA ȘI AFIȘAREA FINALĂ A VALORILOR ȘI TICKURILOR
   ====================================================*/

export function renderAxisMarkers(measurementGroup) {
    const acceptedTexts = {
      x: [],
      y: []
    };

    const acceptedTicks = {
      x: [],
      y: []
    };

  /*
    Valorile importante sunt analizate primele.
    La priorități egale se păstrează ordinea inițială.
  */
    const sortedCandidates = [...axisMarkerCandidates]
      .sort((first, second) =>
        second.priority - first.priority
      );

    sortedCandidates.forEach((candidate) => {
      const {
        group,
        axis,
        coord,
        text,
        alternateText,
        tick,
        priority
      } = candidate;

    /*
      Textul este pus temporar într-un grup SVG vizibil,
      pentru ca browserul să-i măsoare dimensiunea reală.
    */
    measurementGroup.appendChild(text);

    const measuredBox = text.getBBox();

    const textBox = {
      x: measuredBox.x,
      y: measuredBox.y,
      width: measuredBox.width,
      height: measuredBox.height
    };

    text.remove();

    const tickData = {
      coord,
      strokeWidth:
        parseFloat(tick.getAttribute('stroke-width')) || 0,
      priority
    };

    const tickConflict = acceptedTicks[axis].some(
      (acceptedTick) =>
        axisTicksOverlap(tickData, acceptedTick)
    );

    const textConflict = acceptedTexts[axis].some(
      (acceptedTextBox) =>
        axisLabelBoxesOverlap(textBox, acceptedTextBox)
    );

   /* rezolvare conflicte la afișare*/
    let selectedText = text;
    let selectedTextBox = textBox;
    let canShowText = !textConflict;

    if (!tickConflict && textConflict && alternateText) {
      measurementGroup.appendChild(alternateText);

      const measuredAlternateBox =
        alternateText.getBBox();

      const alternateBox = {
        x: measuredAlternateBox.x,
        y: measuredAlternateBox.y,
        width: measuredAlternateBox.width,
        height: measuredAlternateBox.height
    };

    alternateText.remove();

      const alternateConflict =
        acceptedTexts[axis].some(
          (acceptedTextBox) =>
            axisLabelBoxesOverlap(
              alternateBox,
              acceptedTextBox
            )
    );

    if (!alternateConflict) {
        selectedText = alternateText;
        selectedTextBox = alternateBox;
        canShowText = true;
      }
}
/*------------------------------------------------------------*/

/* Dacă tickul nu se suprapune, este afișat. */
    if (!tickConflict) {
          group.appendChild(tick);
          acceptedTicks[axis].push(tickData);
    }

/*Dacă tickurile se suprapun, valoarea inferioară, pierde automat și textul.
Dacă numai textele se suprapun, dispare numai textul; tickul distinct rămâne.*/
    if (!tickConflict && canShowText) {
      group.appendChild(selectedText);
      acceptedTexts[axis].push(selectedTextBox);
    }
    });

  /* Lista va fi reconstruită la următoarea actualizare */
    axisMarkerCandidates.length = 0;
}
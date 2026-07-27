// AxioGraph — app.js

import {
  x0,
  y0,
  gridWidth,
  gridHeight,
  originX,
  coordGuideStroke,
  clamp,
  clampPointToGrid,
  clampAndSnapPoint,
  drawGrid,
  drawAxes,
  valueToGridX as sheetValueToGridX,
  valueToGridY as sheetValueToGridY,
  valuesToSvgPoint as sheetValuesToSvgPoint
} from './sheet.js';

import {
  AXIS_LABEL_PRIORITY,
  resetAxisLabelLayout,
  queueAxisMarker,
  renderAxisMarkers
} from './axisLabelLayout.js';

import {
  drawExperimentalPoint,
  drawSlopePoint,
  drawIntersectionPoint
} from './specialPointsRenderer.js';

import {
  renderTrendlineSvg,
  renderCurveLineSvg
} from './drawingRenderer.js';

import {
  createTrendlineConfigs
} from './trendlineConfig.js';

import {
  cloneTrendlineState,
  restoreTrendlineState
} from './trendlineState.js';

import {
  renderAxisMagnifier
} from './axisMagnifierRenderer.js';


function $(id) {
  return document.getElementById(id);
}

import {
  remapTrendlinesForScaleChange
} from './scaleUpdate.js';

let svg;
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


let experimentalPointsData = [];
let slopePointsData = [];
let slopePointsData2 = [];
let intersectionPointsData1 = { x: null, y: null };
let intersectionPointsData2 = { x: null, y: null };
let hasUnsavedChanges = false;

/* 
Declarațiile lupei — vor fi găsite în init  MAGNIFIER SOURCE  DISPARE 
*/

let magnifierActive = false;
/* Împărțirea fixă a axelor pentru Detail View */
const MAGNIFIER_OX_ZONES = 3;
const MAGNIFIER_OY_ZONES = 3;

/*
  Procentul din lungimea vizibilă a axei ocupat de lupă:
  1 = 100%, 0.9 = 90%, 0.82 = 82%. SINGURUL CARE SE POATE REGLA.
*/
const MAGNIFIER_AXIS_FILL = 1;

/* Grosimea zonei văzute de o parte și de alta a axei */
const MAGNIFIER_CROSS_SOURCE = 14;

/* Compensează borderul pentru alinierea vizuală OX–OY */
const MAGNIFIER_OY_ALIGNMENT_OFFSET_PX = 4.5;

let magnifierSensorsGroup;
let magnifierLens;
let magnifierSvg;

/* ======================================================================
  MAGNIFIER       Trimite motorului LUPEI starea actuală a aplicației
 ========================================================================*/
function renderMagnifierContent(
  axis,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight
) {
  renderAxisMagnifier({
    axis,
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight,
    svg,
    magnifierLens,
    magnifierSvg,
    scaleXValue,
    scaleYValue,
    stepXValue,
    stepYValue,
    intersectionPointsData1,
    intersectionPointsData2,
    experimentalPointsData,
    slopePointsData,
    slopePointsData2,
    trendlineStates,
    trendlineConfigs,
    valueToGridX,
    valueToGridY,
    valuesToSvgPoint
  });
}
/*--------------------------------------------------------------------*/


const trendlineStates = {
  1: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  2: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  3: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  4: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  5: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null },
  6: { isVisible: false, isFixed: false, p1: null, p2: null, dragMode: null, pointerId: null, lastPoint: null }
};

const TRENDLINE_OX_MARGIN = 20;

let trendlineConfigs = {};

const curveLineState = {
  isVisible: false,
  isFixed: false,
  points: [],
  dragIndex: null,
  pointerId: null
};

/* 
Starea lucrării: modificată sau salvată 
=============================================*/
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
/*==========================================================*/

function getSvgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
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
// ----------------------------------------------------

/*=========================================================================
Golește vechiul strat steps; Construiește tickurile si textele;
Le pune în coada de priorități pt OX si Oy
============================================================================*/
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
      //if (i === 0) continue;

      const value = i * stepX;
      const x = originX + (value / scaleX) * 10;

      if (x < x0 || x > x0 + gridWidth) continue;

      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      mark.setAttribute('x1', x);
      mark.setAttribute('y1', y0 - 1.5);
      mark.setAttribute('x2', x);
      mark.setAttribute('y2', y0 + 1.5);
      mark.setAttribute('stroke', '#146f9c');
      mark.setAttribute('stroke-width', 0.25);
     
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = Number(value.toFixed(6));
      text.setAttribute('x', x);
      text.setAttribute('y', y0 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '3.2');
      text.setAttribute('font-family', 'Poppins, sans-serif');
      text.setAttribute('fill', '#146f9c');

      queueAxisMarker({
        group: scaleStepMarksGroup,
        axis: 'x',
        coord: x,
        text,
        tick: mark,
        priority: AXIS_LABEL_PRIORITY.step
      });
    }
  }

  if (!isNaN(scaleY) && scaleY !== 0 && !isNaN(stepY) && stepY > 0) {
    const maxYValue = (gridHeight / 10) * scaleY;
    const numStepsY = Math.floor(maxYValue / stepY);

    for (let i = 1; i <= numStepsY; i++) {
      const value = i * stepY;
      const y = y0 - (value / scaleY) * 10;

      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      mark.setAttribute('x1', originX - 1.5);
      mark.setAttribute('y1', y);
      mark.setAttribute('x2', originX + 1.5);
      mark.setAttribute('y2', y);
      mark.setAttribute('stroke', '#146f9c');
      mark.setAttribute('stroke-width', 0.25);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = Number(value.toFixed(6));
      text.setAttribute('x', originX - 3);
      text.setAttribute('y', y + 1.2);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '3.2');
      text.setAttribute('font-family', 'Poppins, sans-serif');
      text.setAttribute('fill', '#146f9c');
      queueAxisMarker({
        group: scaleStepMarksGroup,
        axis: 'y',
        coord: y,
        text,
        tick: mark,
        priority: AXIS_LABEL_PRIORITY.step
      });
    }
  }
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

  experimentalPointsData = uniquePoints;
  experimentalPointsData.forEach((pt) => drawExperimentalPoint(
    pt.x,
    pt.y,
    valuesToSvgPoint,
    coordGuideStroke,
    experimentalPointsGroup
    ));
}

/*==========================================================================
 Interacțiunea utilizatorului pentru adăugarea unui punct experimental P (x,y)
 ===========================================================================*/

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

  experimentalPointsData.push({ x: valX, y: valY });

  redrawAllSpecialPoints();

  inputX.value = '';
  inputY.value = '';
}
/*=====================================================================*/

/* =====================================================================
Șterge valorile experimentale P(x, y) - ambele în același timp
=======================================================================*/
function deleteFullDataPoint() {
  const inputX = $('point-input-x');
  const inputY = $('point-input-y');

  const valX = parseFloat(inputX.value);
  const valY = parseFloat(inputY.value);

  if (isNaN(valX) || isNaN(valY)) return;

  experimentalPointsData = experimentalPointsData.filter(
    (pt) => !(pt.x === valX && pt.y === valY)
  );

  redrawAllSpecialPoints();

  inputX.value = '';
  inputY.value = '';
}
/*=====================================================================*/

/* ========================================================================
Schimbă scara și păstrează geometria TrendLines și toate punctele desenate
===========================================================================*/
/* Aplică simultan noile scări OX și OY */
function applyScales() {
  const newScaleXText =
    $('scale-input-x').value.trim();

  const newScaleYText =
    $('scale-input-y').value.trim();

  const newScales = {
    x: Number(newScaleXText),
    y: Number(newScaleYText)
  };

  const newScalesAreValid =
    newScaleXText !== '' &&
    newScaleYText !== '' &&
    Number.isFinite(newScales.x) &&
    newScales.x > 0 &&
    Number.isFinite(newScales.y) &&
    newScales.y > 0;

  if (!newScalesAreValid) {
    alert(
      'Enter valid positive values for both X Scale and Y Scale.'
    );
    return;
  }

  /* Confirmare vizuală pentru aplicarea scării */
  const button = $('apply-scale');

  button.classList.remove('is-popping');

  button.addEventListener(
    'animationend',
    () => button.classList.remove('is-popping'),
    { once: true }
  );

  void button.offsetWidth;
  button.classList.add('is-popping');

  const oldScales = {
    x: scaleXValue,
    y: scaleYValue
  };

  const oldScaleX = Number(scaleXValue);
  const oldScaleY = Number(scaleYValue);

  const scalesAreUnchanged =
    Number.isFinite(oldScaleX) &&
    oldScaleX > 0 &&
    Number.isFinite(oldScaleY) &&
    oldScaleY > 0 &&
    Math.abs(oldScaleX - newScales.x) < 1e-9 &&
    Math.abs(oldScaleY - newScales.y) < 1e-9;

  if (scalesAreUnchanged) {
    return;
  }

  /* Remapează simultan OX și OY pentru TrendLines */
  remapTrendlinesForScaleChange({
    oldScales,
    newScales,
    trendlineStates,
    oxMargin: TRENDLINE_OX_MARGIN
  });

  /* Memorează noile scări */
  scaleXValue = newScaleXText;
  scaleYValue = newScaleYText;

  resetTrendline(2);
  resetTrendline(3);
  resetTrendline(5);
  resetTrendline(6);

  resetCurveLine();

  renderTrendline(1);
  renderTrendline(4);

  redrawAllSpecialPoints();
}

/* =================================================================
Curăță stratul Slope și desenează o singură reprezentare
    pentru fiecare P₁, P₂, S₁ și S₂ 
====================================================================*/

function redrawSlopePoints() {
  slopePointsGroup.innerHTML = '';

  if (slopePointsData[0]) {
    drawSlopePoint(
      slopePointsData[0],
      'P₁',
      valuesToSvgPoint,
      slopePointsGroup
    );
  }

  if (slopePointsData[1]) {
    drawSlopePoint(
      slopePointsData[1],
      'P₂',
      valuesToSvgPoint,
      slopePointsGroup
    );
  }

  if (slopePointsData2[0]) {
    drawSlopePoint(
      slopePointsData2[0],
      'S₁',
      valuesToSvgPoint,
      slopePointsGroup
    );
  }

  if (slopePointsData2[1]) {
    drawSlopePoint(
      slopePointsData2[1],
      'S₂',
      valuesToSvgPoint,
      slopePointsGroup
    );
  }
}
/*=======================================================================*/

/* =========================================================================
      Șterge un singur punct de pantă și îi NU golește inputurile
      E FOLOSITA DE BUTONUL DEL 
  ========================================================================= */

function resetSlopePoint(
  index,
  pointsData = slopePointsData
) {
  pointsData[index] = null;
  redrawAllSpecialPoints();
}


/*====================================================================== 
Curăță stratul Intercepts și redesenează toate intersecțiile memorate
======================================================================== */
function redrawIntersectionPoints() {
  intersectionPointsGroup.innerHTML = '';

  if (intersectionPointsData1.x !== null) {
    drawIntersectionPoint(
      'x',
      intersectionPointsData1.x,
      valueToGridX,
      valueToGridY,
      intersectionPointsGroup
    );
  }

  if (intersectionPointsData1.y !== null) {
    drawIntersectionPoint(
      'y',
      intersectionPointsData1.y,
      valueToGridX,
      valueToGridY,
      intersectionPointsGroup
    );
  }

  if (intersectionPointsData2.x !== null) {
    drawIntersectionPoint(
      'x',
      intersectionPointsData2.x,
      valueToGridX,
      valueToGridY,
      intersectionPointsGroup
    );
  }

  if (intersectionPointsData2.y !== null) {
    drawIntersectionPoint(
      'y',
      intersectionPointsData2.y,
      valueToGridX,
      valueToGridY,
      intersectionPointsGroup
    );
  }
}
/* =========================================================================*/

/* ==========================================================================
Redesenarea centrală a tuturor punctelor și etichetelor speciale
========================================================================== */
function redrawAllSpecialPoints() {
  resetAxisLabelLayout();

  experimentalPointsGroup.innerHTML = '';
  slopePointsGroup.innerHTML = '';
  intersectionPointsGroup.innerHTML = '';

  refreshScaleStepLabels();

  redrawIntersectionPoints();
  redrawExperimentalPoints();
  redrawSlopePoints();

  renderAxisMarkers(tickMarksGroup);
}

/* ===================================================================
TRENDLINE   EXTENDLINE   CURVE LINE  GEOMETRIA DESENABILĂ
=======================================================================*/

/* ================================================================
   1. Actualizează butoanele TrendLine și butoanele Fix/Del pentru Extend Line; 
      resetează dreptele și prelungirile 
   ================================================== ===================*/

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

/* ==================================================================
 1'   Actualizează butoanele Fix/Del și resetează Curve Line
====================================================================*/
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

/* ===================================================================
Creează poziția și starea inițială pentru o dreaptă de tendință 
trendlineLogic.js.
===================================================================== */
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
/* ====================================================================
Creează și poziționează o prelungire pornind de la dreapta fixată
trendlineLogic.js.
======================================================================= */
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

/* ===========================================================
2. Desenează TrendLine/Extend Lines și actualizează butoanele
============================================================ */
function renderTrendline(index) {
  renderTrendlineSvg(
    index,
    trendlineStates[index],
    trendlineConfigs[index]
  );

  updateTrendlineButtons(index);
}
/*========================================================
3. Creează punctele inițiale și starea implicită a curbei
========================================================*/
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
/*============================================================
  4. Desenează Curve Line și actualizează butoanele 
 ==============================================================*/
function renderCurveLine() {
  renderCurveLineSvg(
    curveLineState,
    $('curveline-layer')
  );

  updateCurveLineButtons();
}  
/*=====================================================================*/

/* =====================================================================
   MOTORUL SAVE/LOAD — SALVEAZĂ ȘI RESTAUREAZĂ LUCRAREA .AXIO
   ===================================================================== */

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

  /* Sincronizează inputurile Slope și Intercepts cu datele încărcate */
  const setSlopeInputs = (prefix, point) => {
    $(`slope-${prefix}-x`).value = point?.x ?? '';
    $(`slope-${prefix}-y`).value = point?.y ?? '';
  };

  setSlopeInputs('p1', slopePointsData[0]);
  setSlopeInputs('p2', slopePointsData[1]);
  setSlopeInputs('s1', slopePointsData2[0]);
  setSlopeInputs('s2', slopePointsData2[1]);

  $('intersection-x-value').value =
    intersectionPointsData1.x ?? '';

  $('intersection-y-value').value =
    intersectionPointsData1.y ?? '';

  $('intersection-x-value-2').value =
    intersectionPointsData2.x ?? '';

  $('intersection-y-value-2').value =
    intersectionPointsData2.y ?? '';
/*-----------------------------------------------------------------*/
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
/*
 ------------------------------------------------------------------------------*/

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
/* ========================SE TERMINA MOTORUL SAVE=================================*/

/* ===================================================================
   EVENIMENTELE PANOULUI — CONECTEAZĂ INPUTURILE ȘI BUTOANELE
   Sunt centralizate toate listener-ele pentru 
   Scale, Steps, Points, TrendLines, Curve, Save/Load și Preview.
   ================================================== ================*/

function setupInputEvents() {

  $('apply-scale').addEventListener('click', applyScales);
  
  $('step-input-x').addEventListener('input', (e) => {stepXValue = e.target.value.trim();

  redrawAllSpecialPoints();
  });

  $('step-input-y').addEventListener('input', (e) => {stepYValue = e.target.value.trim();

  redrawAllSpecialPoints();
  });


  $('add-point').addEventListener('click', addDataPoint);

  $('delete-full-point').addEventListener('click', deleteFullDataPoint);

  $('point-input-x').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('add-point').click();
  });

  $('point-input-y').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('add-point').click();
  });

/*
Interacțiunea utilizatorului pentru adăugarea și ștergerea punctelor de pantă
*/

  $('add-slope-p1').addEventListener('click', () => {
    const p1x = getNumberFromInput('slope-p1-x');
    const p1y = getNumberFromInput('slope-p1-y');

    if (!valuesToSvgPoint(p1x, p1y)) {
      alert(
        'Check the scale and the coordinates of point P₁. ' +
        'The point must be inside the graph area.'
      );
      return;
    }

    slopePointsData[0] = { x: p1x, y: p1y };
    redrawAllSpecialPoints();
  });


  $('add-slope-p2').addEventListener('click', () => {
    const p2x = getNumberFromInput('slope-p2-x');
    const p2y = getNumberFromInput('slope-p2-y');

    if (!valuesToSvgPoint(p2x, p2y)) {
      alert(
        'Check the scale and the coordinates of point P₂. ' +
        'The point must be inside the graph area.'
      );
      return;
    }

    slopePointsData[1] = { x: p2x, y: p2y };
    redrawAllSpecialPoints();
  });


  $('add-slope-s1').addEventListener('click', () => {
    const s1x = getNumberFromInput('slope-s1-x');
    const s1y = getNumberFromInput('slope-s1-y');

    if (!valuesToSvgPoint(s1x, s1y)) {
      alert('Check the scale and the coordinates of point S₁. The point must be inside the graph area.');
      return;
    }

    slopePointsData2[0] = { x: s1x, y: s1y };
    redrawAllSpecialPoints();
  });
    
  $('add-slope-s2').addEventListener('click', () => {
    const s2x = getNumberFromInput('slope-s2-x');
    const s2y = getNumberFromInput('slope-s2-y');

    if (!valuesToSvgPoint(s2x, s2y)) {
      alert('Check the scale and the coordinates of point S₂. The point must be inside the graph area.');
      return;
    }

    slopePointsData2[1] = { x: s2x, y: s2y };
    redrawAllSpecialPoints();
  });
  

  $('reset-slope-p1').addEventListener('click', () => resetSlopePoint(0));
  $('reset-slope-p2').addEventListener('click', () => resetSlopePoint(1));
  $('reset-slope-s1').addEventListener('click', () => resetSlopePoint(0, slopePointsData2 ));
  $('reset-slope-s2').addEventListener('click', () => resetSlopePoint(1, slopePointsData2 ));
  
 /*
 Interacțiunea utilizatorului 
 pentru adăugarea și ștergerea intersecțiilor cu axele
 */

  $('add-intersection-x').addEventListener('click', () => {
    const value = getNumberFromInput('intersection-x-value');

    if (valueToGridX(value) === null) {
      alert('Check the X-axis scale and the intercept value. The value must be inside the X-axis range.');
      return;
    }

    intersectionPointsData1.x = value;
    redrawAllSpecialPoints();
  });


  $('add-intersection-y').addEventListener('click', () => {
    const value = getNumberFromInput('intersection-y-value');

    if (valueToGridY(value) === null) {
      alert('Check the Y-axis scale and the intercept value. The value must be inside the Y-axis range.');
      return;
    }

    intersectionPointsData1.y = value;
    redrawAllSpecialPoints();
  });


  $('reset-intersection-x').addEventListener('click', () => {
    intersectionPointsData1.x = null;
    redrawAllSpecialPoints();
  });


  $('reset-intersection-y').addEventListener('click', () => {
    intersectionPointsData1.y = null;
    redrawAllSpecialPoints();
  });
  
  $('add-intersection-x-2').addEventListener('click', () => {
    const value = getNumberFromInput('intersection-x-value-2');

    if (valueToGridX(value) === null) {
      alert('Check the X-axis scale and the intercept value.');
      return;
    }

    intersectionPointsData2.x = value;
    redrawAllSpecialPoints();
  });


  $('add-intersection-y-2').addEventListener('click', () => {
    const value = getNumberFromInput('intersection-y-value-2');

    if (valueToGridY(value) === null) {
      alert('Check the Y-axis scale and the intercept value.');
      return;
    }

    intersectionPointsData2.y = value;
    redrawAllSpecialPoints();
  });


  $('reset-intersection-x-2').addEventListener('click', () => {
    intersectionPointsData2.x = null;
    redrawAllSpecialPoints();
  });


  $('reset-intersection-y-2').addEventListener('click', () => {
    intersectionPointsData2.y = null;
    redrawAllSpecialPoints();
  });

// ==========================================================================

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

    hideMagnifierLens();

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
/*===================================================================================*/

/*====================================================================
COORDONARE DINTRE SVG, STARE APLICAȚIE ȘI RENDERE
======================================================================*/

/* Controlează deplasarea dreptelor, prelungirilor și curbei cu mouse-ul sau atingerea */
function setupPointerEvents() {

/* CORECȚIE MOBIL: împiedică browserul să preia gestul de drag */
  svg.addEventListener(
    'touchstart',
    (evt) => {
      if (!window.matchMedia('(max-width: 700px)').matches) return;

          const touchedDrawing = evt.target.matches(
              '.trend-hit-band, ' +
              '.trend-handle, ' +
              '.trend-handle-hit, ' +
              '.curve-handle, ' +
              '.curve-handle-hit,'+
             '.magnifier-sensor'
           );

          if (!touchedDrawing) return;

      evt.preventDefault();
    },
    { passive: false }
  );
/*-----------------------------------------------------------------------*/

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

      if (
        (index === 1 || index === 4) &&
        (state.dragMode === 'handle1' || state.dragMode === 'handle2')
      ) {
        currentPoint.y = Math.min(
          currentPoint.y,
          y0 - TRENDLINE_OX_MARGIN
        );
      }

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

       const maxDy =
          y0 -
          TRENDLINE_OX_MARGIN -
          Math.max(state.p1.y, state.p2.y);

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

/* Marchează lucrarea ca modificată după scriere sau apăsarea butoanelor */
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
/*====================================================================*/

/* ==================================================================
   AXIS DETAIL VIEW — SENZORI, RANDARE ȘI CONTROLUL LUPEI
   ================================================================== */

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

/* ====================================================================
AFIȘEAZĂ LUPA pentru axa și poziția selectată 
=======================================================================*/
function showMagnifierAt(
    axis,
    svgX,
    svgY,
    sourceWindow = null
    ) 
{
    let sourceMinX;
    let sourceMinY;
    let sourceWidth;
    let sourceHeight;

    if (sourceWindow) {
      ({
        sourceMinX,
        sourceMinY,
        sourceWidth,
        sourceHeight
      } = sourceWindow);
    } else if (axis === 'x') {


      /* -----------------------------------------------------
      OX: clickul selectează una dintre cele 3 treimi fixe;
      dragul deplasează apoi continuu fereastra-sursă.---------------------- */
      const zoneWidth =
        gridWidth / MAGNIFIER_OX_ZONES;

      const positionInAxis = clamp(
        svgX - x0,
        0,
        gridWidth
      );

      const zoneIndex = Math.min(
        MAGNIFIER_OX_ZONES - 1,
        Math.floor(positionInAxis / zoneWidth)
      );

      sourceMinX = x0 + zoneIndex * zoneWidth;
      sourceWidth = zoneWidth;

      /*------------------------------------!!!!!!!!!!!!!!!!!
        % din zona transversală este deasupra OX,
        iar % rămâne dedesubt pentru tickuri și valori.
  --------------------------------------------------------------- */
      sourceMinY =
        y0 - MAGNIFIER_CROSS_SOURCE * 0.75;

      sourceHeight = MAGNIFIER_CROSS_SOURCE;
      

    } else {
      /* ------------------------------------------------------------
          OY: clickul selectează una dintre cele 3 treimi
          dragul deplasează apoi continuu fereastra-sursă. ------------------*/
      const zoneHeight =
        gridHeight / MAGNIFIER_OY_ZONES;

      const positionFromOrigin = clamp(
        y0 - svgY,
        0,
        gridHeight
      );

      const zoneIndex = Math.min(
        MAGNIFIER_OY_ZONES - 1,
        Math.floor(positionFromOrigin / zoneHeight)
      );

      sourceMinX =
        originX - MAGNIFIER_CROSS_SOURCE / 2;

      sourceWidth = MAGNIFIER_CROSS_SOURCE;

      sourceMinY =
        y0 - (zoneIndex + 1) * zoneHeight;

      sourceHeight = zoneHeight;

    /* Zona de jos include și spațiul necesar sub origine */
      if (zoneIndex === 0) {
        sourceMinY += MAGNIFIER_CROSS_SOURCE * 0.2;
      }

    }

/* Alegem forma orizontală sau verticală */
    magnifierLens.classList.toggle('is-x', axis === 'x');
    magnifierLens.classList.toggle('is-y', axis === 'y');

/* Dimensiunea reală, în pixeli, a grilei afișate */
    const gridTopLeft = svgPointToContainer(
      x0,
      y0 - gridHeight
    );

    const gridBottomRight = svgPointToContainer(
      x0 + gridWidth,
      y0
    );

    const displayedGridWidth = Math.abs(
      gridBottomRight.x - gridTopLeft.x
    );

    const displayedGridHeight = Math.abs(
      gridBottomRight.y - gridTopLeft.y
    );

    let lensWidth;
    let lensHeight;

    if (axis === 'x') {
      lensWidth =
        displayedGridWidth * MAGNIFIER_AXIS_FILL;

      lensHeight =
        lensWidth * (sourceHeight / sourceWidth);
    } else {
      lensHeight =
        displayedGridHeight * MAGNIFIER_AXIS_FILL;

      lensWidth =
        lensHeight * (sourceWidth / sourceHeight);
    }

    magnifierLens.style.width = lensWidth + 'px';
    magnifierLens.style.height = lensHeight + 'px';
/*--------------------------------------------------------------------*/

  /* Trebuie afișată înainte să-i putem măsura dimensiunea */
  magnifierLens.hidden = false;
  magnifierLens.setAttribute('aria-hidden', 'false');

  renderMagnifierContent(
  axis,
  sourceMinX,
  sourceMinY,
  sourceWidth,
  sourceHeight
);
/* treb modificat cred -------------------------*/

  const containerRect =
    $('a4-container').getBoundingClientRect();

  const actualLensWidth =
    magnifierLens.offsetWidth;

  const actualLensHeight =
    magnifierLens.offsetHeight;

  let left;
  let top;

  if (axis === 'x') {
    /*
      Fereastra este centrată pe lungimea OX.
      Axa din lupă se suprapune peste OX reală.
    */
    const axisAnchor =
      svgPointToContainer(originX, y0);

    const axisPositionInLens =
      (y0 - sourceMinY) / sourceHeight;

    left =
      gridTopLeft.x +
      (displayedGridWidth - actualLensWidth) / 2;

    top =
      axisAnchor.y -
      actualLensHeight * axisPositionInLens;
  } else {
    /*
      Fereastra este centrată pe lungimea OY.
      Axa din lupă se suprapune peste OY reală.
    */
    const axisAnchor =
      svgPointToContainer(originX, y0);

    left =
      axisAnchor.x - actualLensWidth / 2;

  /* Folosește zona originii pentru a păstra lupa OY fixă în timpul dragului. */

    const originSourceMinY =
      y0 - sourceHeight +
      MAGNIFIER_CROSS_SOURCE * 0.2;

    const axisPositionInLens =
      (y0 - originSourceMinY) / sourceHeight;

    top =
      axisAnchor.y -
      actualLensHeight * axisPositionInLens
      + MAGNIFIER_OY_ALIGNMENT_OFFSET_PX;
  }

    left = clamp(
      left,
      0,
      Math.max(0, containerRect.width - actualLensWidth)
  );

    top = clamp(
      top,
      0,
      Math.max(0, containerRect.height - actualLensHeight)
  );

    magnifierLens.style.left = left + 'px';
    magnifierLens.style.top = top + 'px';

  return {
    sourceMinX,
    sourceMinY,
    sourceWidth,
    sourceHeight
  };  
}

/*==========================showMagnifierAt()============================*/

/* Creează zonele largi de click/tap din jurul axelor */
function setupMagnifierEngine() {
  magnifierSensorsGroup = $('magnifier-sensors');
  magnifierLens = $('magnifier-lens');
  magnifierSvg = $('magnifier-svg');
  
  magnifierSensorsGroup.innerHTML = '';

  let dragState = null;
  let pendingDragPoint = null;
  let animationFrameId = null;

/*=====================Motorul mișcării======================*/
  function renderPendingMagnifierDrag() {
    animationFrameId = null;

    if (!magnifierActive || !dragState || !pendingDragPoint) return;

    const point = pendingDragPoint;
    pendingDragPoint = null;

    const currentCoord =
      dragState.axis === 'x'
        ? point.x
        : point.y;

    const delta =
      currentCoord - dragState.startCoord;

    const sourceWindow = {
      sourceMinX: dragState.sourceMinX,
      sourceMinY: dragState.sourceMinY,
      sourceWidth: dragState.sourceWidth,
      sourceHeight: dragState.sourceHeight
    };

    if (dragState.axis === 'x') {
      sourceWindow.sourceMinX = clamp(
        dragState.sourceMinX + delta,
        x0,
        x0 + gridWidth - dragState.sourceWidth
      );
    } else {
      const maximumSourceMinY =
        y0 -
        dragState.sourceHeight +
        MAGNIFIER_CROSS_SOURCE * 0.2;

      sourceWindow.sourceMinY = clamp(
        dragState.sourceMinY + delta,
        y0 - gridHeight,
        maximumSourceMinY
      );
    }

    showMagnifierAt(
      dragState.axis,
      point.x,
      point.y,
      sourceWindow
    );
  }

  function scheduleMagnifierDrag(point) {
    pendingDragPoint = point;

    if (animationFrameId !== null) return;

    animationFrameId = requestAnimationFrame(
      renderPendingMagnifierDrag
    );
  }
/*----------------------------------------------------------------*/

/* ========================TODO mobil — îmbunătățire opțională:
Lupa funcționează prin tap/click pe axă.
Pentru drag fluid din întreaga fereastră afișată, senzorii OX/OY
ar trebui extinși la suprafața lupei, numai cât timp Detail View este activ,
fără să intercepteze dreptele și prelungirile când lupa este oprită.
=======================================================================*/
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

    sensor.setAttribute('class', 'magnifier-sensor');

    //sensor.setAttribute('pointer-events', 'all');
    sensor.style.cursor = 'zoom-in';

    /*
      Oprim evenimentele înainte să ajungă la instrumentele
      care desenează sau mută liniile pe grafic.
    */

    sensor.style.touchAction = 'none';

    sensor.addEventListener('pointerdown', (event) => {
      if (!magnifierActive) return;

      event.preventDefault();
      event.stopPropagation();

      const point = getSvgPoint(event);

      const sourceWindow = showMagnifierAt(
        axis,
        point.x,
        point.y
      );

      dragState = {
        axis,
        pointerId: event.pointerId,
        startCoord: axis === 'x' ? point.x : point.y,
        ...sourceWindow
      };

      pendingDragPoint = null;

      sensor.setPointerCapture(event.pointerId);

      $('magnifier-tip').hidden = true;
    });

    sensor.addEventListener('pointermove', (event) => {
      if (
        !magnifierActive ||
        !dragState ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      scheduleMagnifierDrag(
        getSvgPoint(event)
      );
    });

    function stopMagnifierDrag(event) {
      if (
        !dragState ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      pendingDragPoint = getSvgPoint(event);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      renderPendingMagnifierDrag();
      dragState = null;

      if (sensor.hasPointerCapture(event.pointerId)) {
        sensor.releasePointerCapture(event.pointerId);
      }
    }

    sensor.addEventListener(
      'pointerup',
      stopMagnifierDrag
    );

    sensor.addEventListener(
      'pointercancel',
      stopMagnifierDrag
    );
    sensor.addEventListener(
      'lostpointercapture',
      stopMagnifierDrag
    );

    magnifierSensorsGroup.appendChild(sensor);
  }

  createAxisSensor('x');
  createAxisSensor('y');

  /* La pornirea aplicației, senzorii nu interceptează nimic */
  magnifierSensorsGroup.setAttribute('pointer-events', 'none');
  hideMagnifierLens();
}
/*====================================================================*/

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

/*================================================================*/


function init() {
  svg = $('graph');
  tickMarksGroup = $('tick-marks');
  scaleStepMarksGroup = $('scale-step-marks');
  experimentalPointsGroup = $('experimental-points');
  slopePointsGroup = $('slope-points');
  intersectionPointsGroup = $('intersection-points');

  trendlineConfigs = createTrendlineConfigs($);

  drawGrid();
  drawAxes();
 
  redrawAllSpecialPoints();

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

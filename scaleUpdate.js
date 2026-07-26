/*Logica modulului:
1. primește axa, scala veche și scala nouă;
2. transformă coordonatele SVG ale TrendLines în valori matematice;
3. transformă valorile matematice în noile coordonate SVG;
4. păstrează neschimbate punctele Experimental,Slope și Intercepts.
5. sterge extendLines și CurveLine
6. dacă vechile capete ies din zona permisă,
   creează capete noi pe aceeași dreaptă, fără să-i modifice panta.
În app.js, updateScale():validează noua scală;cheamă remaparea;memorează noua scală;redesenează lucrarea o singură dată.*/

import {
  x0,
  y0,
  gridWidth,
  gridHeight,
  originX,
  gridXToValue,
  gridYToValue
} from './sheet.js';

const EPSILON = 1e-9;

/* Verifică dacă un punct se află în zona permisă TrendLine */
function isPointInside(point, limits) {
  return (
    point.x >= limits.minX &&
    point.x <= limits.maxX &&
    point.y >= limits.minY &&
    point.y <= limits.maxY
  );
}

/*
  Calculează punctele în care dreapta determinată de p₁ și p₂
  intersectează marginile zonei permise.
*/
function getLineIntersections(p1, p2, limits) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const intersections = [];

  function addIntersection(t, x, y) {
    if (
      x < limits.minX - EPSILON ||
      x > limits.maxX + EPSILON ||
      y < limits.minY - EPSILON ||
      y > limits.maxY + EPSILON
    ) {
      return;
    }

    const alreadyAdded = intersections.some(
      (item) =>
        Math.abs(item.point.x - x) < EPSILON &&
        Math.abs(item.point.y - y) < EPSILON
    );

    if (!alreadyAdded) {
      intersections.push({
        t,
        point: { x, y }
      });
    }
  }

  if (Math.abs(dx) > EPSILON) {
    let t = (limits.minX - p1.x) / dx;
    addIntersection(t, limits.minX, p1.y + t * dy);

    t = (limits.maxX - p1.x) / dx;
    addIntersection(t, limits.maxX, p1.y + t * dy);
  }

  if (Math.abs(dy) > EPSILON) {
    let t = (limits.minY - p1.y) / dy;
    addIntersection(t, p1.x + t * dx, limits.minY);

    t = (limits.maxY - p1.y) / dy;
    addIntersection(t, p1.x + t * dx, limits.maxY);
  }

  return intersections.sort((a, b) => a.t - b.t);
}

/* Păstrează dreapta și mută numai mânerele ieșite din zonă */
function fitTrendlineToLimits(p1, p2, limits) {
  const p1Inside = isPointInside(p1, limits);
  const p2Inside = isPointInside(p2, limits);

  if (p1Inside && p2Inside) {
    return { p1, p2 };
  }

  const intersections = getLineIntersections(p1, p2, limits);

  if (intersections.length < 2) {
    return null;
  }

  if (p1Inside) {
    return {
      p1,
      p2: intersections[intersections.length - 1].point
    };
  }

  if (p2Inside) {
    return {
      p1: intersections[0].point,
      p2
    };
  }

  return {
    p1: intersections[0].point,
    p2: intersections[intersections.length - 1].point
  };
}

/* Transformă un punct SVG conform noii scări */
/* Transformă simultan coordonatele X și Y ale unui punct */
function remapPoint(point, oldScales, newScales) {
  const valueX = gridXToValue(point.x, oldScales.x);
  const valueY = gridYToValue(point.y, oldScales.y);

  return {
    x: originX + (valueX / newScales.x) * 10,
    y: y0 - (valueY / newScales.y) * 10
  };
}

/* Ascunde o dreaptă care nu mai intersectează zona permisă */
function clearTrendlineState(state) {
  state.isVisible = false;
  state.isFixed = false;
  state.p1 = null;
  state.p2 = null;
  state.dragMode = null;
  state.pointerId = null;
  state.lastPoint = null;
}

/*
  Remapează simultan OX și OY pentru TrendLines 1 și 4.
  Experimental, Slope și Intercepts nu sunt modificate aici.
*/
export function remapTrendlinesForScaleChange({
  oldScales,
  newScales,
  trendlineStates,
  oxMargin
}) {
  const previousScales = {
    x: Number(oldScales?.x),
    y: Number(oldScales?.y)
  };

  const nextScales = {
    x: Number(newScales?.x),
    y: Number(newScales?.y)
  };

  const newScalesAreValid =
    Number.isFinite(nextScales.x) &&
    nextScales.x > 0 &&
    Number.isFinite(nextScales.y) &&
    nextScales.y > 0;

  if (!newScalesAreValid) {
    return false;
  }

  const oldScalesAreValid =
    Number.isFinite(previousScales.x) &&
    previousScales.x > 0 &&
    Number.isFinite(previousScales.y) &&
    previousScales.y > 0;

  const limits = {
    minX: x0,
    maxX: x0 + gridWidth,
    minY: y0 - gridHeight,
    maxY: y0 - oxMargin
  };

  for (const index of [1, 4]) {
    const state = trendlineStates[index];

    if (!state?.isVisible || !state.p1 || !state.p2) {
      continue;
    }

    /*
      Fără ambele scări vechi nu putem recupera
      valorile matematice ale dreptei existente.
    */
    if (!oldScalesAreValid) {
      clearTrendlineState(state);
      continue;
    }

    const remappedP1 = remapPoint(
      state.p1,
      previousScales,
      nextScales
    );

    const remappedP2 = remapPoint(
      state.p2,
      previousScales,
      nextScales
    );

    const fittedLine = fitTrendlineToLimits(
      remappedP1,
      remappedP2,
      limits
    );

    if (!fittedLine) {
      /*
        Dreapta este temporar în afara foii.
        Geometria rămâne memorată pentru a putea reapărea.
      */
      state.p1 = remappedP1;
      state.p2 = remappedP2;
      state.dragMode = null;
      state.pointerId = null;
      state.lastPoint = null;
      continue;
    }

    state.p1 = fittedLine.p1;
    state.p2 = fittedLine.p2;
    state.dragMode = null;
    state.pointerId = null;
    state.lastPoint = null;
  }

  return true;
}
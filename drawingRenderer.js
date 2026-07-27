// FUNCȚIILE DE DESENARE

/*=============================================================
Funcție ajutătoare pentru draw pe mobil
===============================================================*/

function appendHandleHitArea(layer, point, className, data) {
  const hitArea = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  );

  hitArea.setAttribute('cx', point.x);
  hitArea.setAttribute('cy', point.y);
  hitArea.setAttribute('r', 8);
  hitArea.setAttribute('fill', 'transparent');
  hitArea.setAttribute('pointer-events', 'none');
  hitArea.setAttribute('class', className);

  Object.assign(hitArea.dataset, data);

  layer.appendChild(hitArea);
}
/*--------------------------------------------------------------------*/

export function renderTrendlineSvg(index, state, cfg) {
  const layer = cfg.layer;
  layer.innerHTML = '';

  if (!state.isVisible || !state.p1 || !state.p2) {
    return;
  }
/* Line 1 și Line 4 sunt dreptele principale; celelalte sunt prelungiri. */
  const isMainLine = index === 1 || index === 4;

/* Desenează dreapta sau prelungirea vizibilă. */
  const visibleLine = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line'
  );

  visibleLine.setAttribute('x1', state.p1.x);
  visibleLine.setAttribute('y1', state.p1.y);
  visibleLine.setAttribute('x2', state.p2.x);
  visibleLine.setAttribute('y2', state.p2.y);
  visibleLine.setAttribute(
    'stroke',
    state.isFixed ? cfg.fixedColor : cfg.color
  );
  visibleLine.setAttribute(
    'stroke-width',
    state.isFixed ? 0.45 : 0.6
  );
  visibleLine.setAttribute(
    'stroke-opacity',
    state.isFixed ? 1 : 0.78
  );
  visibleLine.setAttribute('stroke-linecap', 'round');

  if (!isMainLine) {
    visibleLine.setAttribute('stroke-dasharray', '2,1.6');
  }

  visibleLine.dataset.role = isMainLine ? 'line' : 'extension';
  visibleLine.dataset.trendline = String(index);
  visibleLine.style.cursor =
    state.isFixed || !isMainLine ? 'default' : 'move';

  layer.appendChild(visibleLine);

  /* După Fix, păstrează numai desenul și elimină toate zonele de editare. */
  if (state.isFixed) return;

  /* Creează zona invizibilă groasă pentru prinderea dreptei cu mouse-ul. */
  if (isMainLine) {
    const hitLine = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'line'
    );

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

/* Creează o bandă transparentă pentru atingerea dreptei pe mobil */
    const dx = state.p2.x - state.p1.x;
    const dy = state.p2.y - state.p1.y;
    const length = Math.hypot(dx, dy) || 1;

    const halfWidth = 8;
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;

    const hitBand = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );

    hitBand.setAttribute(
      'points',
      [
        `${state.p1.x + offsetX},${state.p1.y + offsetY}`,
        `${state.p2.x + offsetX},${state.p2.y + offsetY}`,
        `${state.p2.x - offsetX},${state.p2.y - offsetY}`,
        `${state.p1.x - offsetX},${state.p1.y - offsetY}`
      ].join(' ')
    );

    hitBand.setAttribute('fill', 'transparent');
    hitBand.setAttribute('pointer-events', 'none');
    hitBand.setAttribute('class', 'trend-hit-band');

    hitBand.dataset.role = 'line';
    hitBand.dataset.trendline = String(index);
    hitBand.style.cursor = 'move';

    layer.appendChild(hitBand);

    /* Creeaza și afișează primul mâner există numai la dreptele principale.
    Zona invizibilă mărită îl face ușor de prins pe mobil. */
    const handle1 = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );

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

    appendHandleHitArea(
      layer,
      state.p1,
      'trend-handle-hit',
      { role: 'handle1', trendline: String(index) }
    );
  }

  /* Al doilea mâner există la toate cele șase drepte.
  La prelungiri, acesta este singurul mâner care poate fi deplasat. */
  const handle2 = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle'
  );

  handle2.setAttribute('cx', state.p2.x);
  handle2.setAttribute('cy', state.p2.y);
  handle2.setAttribute('r', isMainLine ? 1.8 : 2.1);
  handle2.setAttribute('fill', '#ffffff');
  handle2.setAttribute('stroke', cfg.color);
  handle2.setAttribute('stroke-width', 0.4);
  handle2.setAttribute('class', 'trend-handle');

  handle2.dataset.role = 'handle2';
  handle2.dataset.trendline = String(index);
  handle2.style.cursor = 'grab';

  layer.appendChild(handle2);

  /*Adaugă peste el zona invizibilă mărită pentru atingerea pe mobil.*/

  appendHandleHitArea(
    layer,
    state.p2,
    'trend-handle-hit',
    { role: 'handle2', trendline: String(index) }
  );
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

export function renderCurveLineSvg(curveLineState, layer) {
  layer.innerHTML = '';

  if (!curveLineState.isVisible || curveLineState.points.length === 0) {
    return;
  }

  const path = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );

  path.setAttribute('d', buildSmoothPath(curveLineState.points));
  path.setAttribute('fill', 'none');
  path.setAttribute(
    'stroke',
    curveLineState.isFixed ? '#d51a6b' : '#AD1457'
  );
  path.setAttribute(
    'stroke-width',
    curveLineState.isFixed ? 0.45 : 0.65
  );
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.dataset.role = 'curve';

  layer.appendChild(path);

  if (!curveLineState.isFixed) {
    curveLineState.points.forEach((pt, index) => {
      const handle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );

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

      /* Adaugă peste fiecare mâner al curbei o zonă invizibilă mărită
      pentru atingerea ușoară pe mobil; mânerul vizibil rămâne neschimbat. */
      appendHandleHitArea(
        layer,
        pt,
        'curve-handle-hit',
        { role: 'curve-handle', index: String(index) }
      );
    });
  }
}
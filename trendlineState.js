/* Copiază și restaurează starea salvată a dreptelor,
   fără starea temporară de drag */

function clonePoint(point) {
  if (!point) return null;

  return {
    x: point.x,
    y: point.y
  };
}

export function cloneTrendlineState(state) {
  return {
    isVisible: state.isVisible,
    isFixed: state.isFixed,
    p1: clonePoint(state.p1),
    p2: clonePoint(state.p2)
  };
}

export function restoreTrendlineState(target, saved) {
  target.isVisible = !!saved?.isVisible;
  target.isFixed = !!saved?.isFixed;
  target.p1 = clonePoint(saved?.p1);
  target.p2 = clonePoint(saved?.p2);
  target.dragMode = null;
  target.pointerId = null;
  target.lastPoint = null;
}
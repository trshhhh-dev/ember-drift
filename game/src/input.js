// Input: the keyboard and the pointer, folded into one small intent. Aim with the mouse or fly
// with WASD / arrows; Space or a click burns a flare; P / Esc pauses; R restarts. On the upgrade
// screen the digits pick a boon and a click picks the card under it. A mouse that has just moved
// steers, and any movement key takes control back, so the two never fight.

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const BLOCKED = new Set([...MOVE_KEYS, 'Space', 'Enter', 'KeyP', 'Escape', 'KeyR', 'KeyM', 'Digit1', 'Digit2', 'Digit3']);
const CHOICE_KEYS = {
  Digit1: 0, Digit2: 1, Digit3: 2,
  Numpad1: 0, Numpad2: 1, Numpad3: 2,
};

/** The pointer's distance in pixels at which mouse steering reaches full speed. */
const POINTER_FULL_SPEED = 34;

/**
 * Listen on the window and return the input state:
 *   take()        the actions pressed since the last call (start, pause, restart, flare, mute)
 *   direction()   the held movement keys as a unit vector
 *   pointer()     the pointer's position and whether it is steering
 *   active()      whether any key is held (used to wake the title screen)
 */
export function createInput(canvas) {
  const held = new Set();
  const pointer = { x: 0, y: 0, steering: false, seen: false };
  const pressed = { start: false, pause: false, restart: false, flare: false, mute: false, choice: -1, pick: null };

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onKeyDown(event) {
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'Space' || event.code === 'Enter') pressed.start = true;
      if (event.code === 'Space') pressed.flare = true;
      if (event.code === 'KeyP' || event.code === 'Escape') pressed.pause = true;
      if (event.code === 'KeyR') pressed.restart = true;
      if (event.code === 'KeyM') pressed.mute = true;
      if (CHOICE_KEYS[event.code] !== undefined) pressed.choice = CHOICE_KEYS[event.code];
    }
    if (MOVE_KEYS.has(event.code)) {
      held.add(event.code);
      pointer.steering = false;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerMove(event) {
    const point = localPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;
    if (event.pointerType === 'mouse' && (Math.abs(event.movementX) + Math.abs(event.movementY) > 0)) {
      pointer.steering = true;
      pointer.seen = true;
    }
  }

  function onPointerDown(event) {
    const point = localPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.steering = true;
    pointer.seen = true;
    pressed.start = true;
    pressed.flare = true;
    pressed.pick = { x: point.x, y: point.y };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('blur', () => held.clear());

  return {
    take() {
      const actions = { ...pressed };
      pressed.start = false;
      pressed.pause = false;
      pressed.restart = false;
      pressed.flare = false;
      pressed.mute = false;
      pressed.choice = -1;
      pressed.pick = null;
      return actions;
    },
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      const length = Math.hypot(x, y);
      return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
    },
    pointer() {
      return pointer;
    },
    active() {
      return held.size > 0;
    },
  };
}

// A tiny publish/subscribe bus so systems can react to crimes, kills and mission beats
// without importing each other.

const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(fn);
  return () => off(name, fn);
}

export function off(name, fn) {
  const list = listeners.get(name);
  if (!list) return;
  const i = list.indexOf(fn);
  if (i >= 0) list.splice(i, 1);
}

export function emit(name, data) {
  const list = listeners.get(name);
  if (!list) return;
  for (const fn of [...list]) fn(data);
}

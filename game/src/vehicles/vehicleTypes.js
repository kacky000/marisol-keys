// Every vehicle model on the island: invented makes, dimensions, handling and paint palettes.

export const VEHICLE_TYPES = {
  sedan: {
    name: 'Solara Vela', len: 4.6, width: 1.9, height: 1.45, wheelbase: 2.7, wheelR: 0.36,
    maxSpeed: 44, accel: 13, brake: 26, grip: 7.5, steer: 0.62, health: 900, mass: 1.0,
    cabin: { front: 0.25, back: -1.35, top: 1.42, slopeF: 0.75, slopeB: 0.45 }, paints: ['#e9e4da', '#2f5d8a', '#b8323a', '#3d3f45', '#8fd3c8', '#f1c27d', '#ffffff'],
  },
  sports: {
    name: 'Kestrel Strata GT', len: 4.5, width: 2.0, height: 1.2, wheelbase: 2.65, wheelR: 0.36,
    maxSpeed: 60, accel: 20, brake: 32, grip: 9, steer: 0.58, health: 800, mass: 0.9,
    cabin: { front: 0.0, back: -1.25, top: 1.18, slopeF: 1.0, slopeB: 0.8 }, paints: ['#ff5a36', '#ffd23f', '#17c3b2', '#ff3f8e', '#f5f5f5', '#6a4cff'],
  },
  pickup: {
    name: 'Mako Tradesman', len: 5.3, width: 2.05, height: 1.8, wheelbase: 3.2, wheelR: 0.44,
    maxSpeed: 38, accel: 11, brake: 22, grip: 6.5, steer: 0.55, health: 1200, mass: 1.4,
    cabin: { front: 0.65, back: -0.75, top: 1.85, slopeF: 0.45, slopeB: 0.05 }, bed: true, paints: ['#c0392b', '#2c3e50', '#d9c9a3', '#3b6e4f', '#ececec'],
  },
  taxi: {
    name: 'Keys Cab', len: 4.7, width: 1.9, height: 1.5, wheelbase: 2.75, wheelR: 0.36,
    maxSpeed: 42, accel: 12, brake: 25, grip: 7.2, steer: 0.6, health: 950, mass: 1.0,
    cabin: { front: 0.25, back: -1.4, top: 1.48, slopeF: 0.7, slopeB: 0.45 }, taxiSign: true, paints: ['#ffd23f'],
  },
  bus: {
    name: 'Coastline Transit', len: 11, width: 2.6, height: 3.1, wheelbase: 6.6, wheelR: 0.5,
    maxSpeed: 26, accel: 6, brake: 16, grip: 5, steer: 0.5, health: 2200, mass: 3.5,
    cabin: { front: 5.2, back: -5.2, top: 3.1, slopeF: 0.05, slopeB: 0.0 }, bus: true, paints: ['#19a7a0'],
  },
  police: {
    name: 'MKPD Interceptor', len: 4.8, width: 1.95, height: 1.48, wheelbase: 2.8, wheelR: 0.37,
    maxSpeed: 52, accel: 17, brake: 30, grip: 8.2, steer: 0.6, health: 1300, mass: 1.15,
    cabin: { front: 0.2, back: -1.4, top: 1.45, slopeF: 0.72, slopeB: 0.45 }, police: true, paints: ['#f4f4f2'],
  },
  van: {
    name: 'Sunrise Courier Van', len: 5.4, width: 2.1, height: 2.4, wheelbase: 3.3, wheelR: 0.4,
    maxSpeed: 34, accel: 9, brake: 20, grip: 6, steer: 0.55, health: 1400, mass: 1.6,
    cabin: { front: 1.9, back: -2.6, top: 2.4, slopeF: 0.55, slopeB: 0.0 }, paints: ['#ffffff', '#ff6b35'],
  },
  boat: {
    name: 'Riptide 22 Speedboat', len: 7, width: 2.3, height: 1.4, wheelbase: 3, wheelR: 0.3,
    maxSpeed: 40, accel: 12, brake: 10, grip: 2.2, steer: 0.55, health: 1000, mass: 1.2,
    boat: true, paints: ['#ffffff', '#1d3557', '#e63946'],
  },
  bike: {
    name: 'Zephyr 400', len: 2.1, width: 0.7, height: 1.1, wheelbase: 1.45, wheelR: 0.33,
    maxSpeed: 50, accel: 18, brake: 28, grip: 8.5, steer: 0.5, health: 500, mass: 0.35,
    bike: true, paints: ['#ff3f3f', '#1f1f1f', '#2fb5ff', '#ffcf3f'],
  },
};

export const TRAFFIC_MIX = ['sedan', 'sedan', 'sedan', 'sports', 'pickup', 'taxi', 'taxi', 'van', 'bike', 'sedan', 'pickup', 'bus'];

export const kmh = (ms) => Math.round(Math.abs(ms) * 3.6);

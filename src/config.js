// Approximate metres, inferred from the supplied satellite and street-view images.
// +Z is the street/front; -X is the carport when looking from the street.
// Carport geometry, parking bays and its lights use local coordinates before yaw.
// These are visual modelling parameters, not surveyed property boundaries.
export const HOME = {
  // Rectangular parcel: short front/rear edges; side 1 is one continuous fence.
  lot: { x: 4.065, width: 15.43, depth: 28.9, z: 2.15 },
  fence: { frontZ: 16.6, backZ: -12.3, leftX: -3.65, rightX: 11.78 },
  house: { x: 3.5, z: -3.0, width: 10.4, depth: 9.2, wallHeight: 3.2, roofHeight: 2.1 },
  porch: { x: 5.9, z: 2.0, width: 5.6, depth: 3.8, wallHeight: 3.2, roofHeight: 1.5 },
  // Rectangular canopy. Bays run along Z; vehicles face +X, toward side 2.
  carport: {
    x: .6, z: 10.5, width: 4.6, depth: 10.4, height: 3.35, rotationDegrees: 0,
    parkingSpaces: 4, parkingAxis: 'z',
    vehicles: [
      { x: 0, z: 3.75, color: '#d4d9db', pickup: false, heightScale: 1.16, rotationDegrees: 90 },
      { x: 0, z: 1.3, color: '#292e34', pickup: false, rotationDegrees: 90 },
    ],
  },
  kitchen: { x: 3.5, z: -9.2, width: 10.4, depth: 3.2, height: 2.8, roofSlopeDegrees: -8 },
  rearGate: { x: -2.65, width: 1.0, height: 1.85, openingDegrees: 65 },
  sidePassages: { left: { x: -2.65, width: 1.65 }, right: { x: 9.6, width: 1.35 } },
  gate: { center: 7.85, width: 6.1, height: 1.8 },
  colors: {
    wall: '#a2aaa8', trim: '#e8e7dc', roof: '#77665b', roofEdge: '#574c46',
    fence: '#333b38', concrete: '#d5d0bf', grass: '#7b9067', timber: '#b77540',
  },
  trees: [
    { x: 11.55, z: 4.1, height: 5.1, radius: 2.0 },
    { x: 10.9, z: -5.7, height: 3.2, radius: .9 },
  ],
  lights: {
    house: { label: 'หน้าบ้าน', positions: [[3.4, 2.8, 3.8], [7.5, 2.8, 3.8]], intensity: 32 },
    carport: { label: 'โรงจอดรถ', space: 'carport', positions: [[0, 3.05, -2.6], [0, 3.05, 2.6]], intensity: 40 },
    fence: { label: 'รั้วและทางเข้า', positions: [[-3.57, 2.55, 16.6], [4.8, 2.55, 16.6], [10.9, 2.55, 16.6], [11.7, 2.55, 16.6]], intensity: 20 },
  },
};

export const VIEWS = {
  overview: { label: 'ภาพรวม', position: [-32, 34, 51], target: [4.065, 1, 2.15] },
  front: { label: 'ด้านหน้า', position: [4.065, 10, 64], target: [4.065, 1.9, 2.15] },
  top: { label: 'มุมบน', position: [4.065, 82, 2.16], target: [4.065, 0, 2.15] },
  left: { label: 'ข้างบ้าน 1 · ฝั่งซ้าย', position: [-4.7, 7, 5], target: [-2.65, 1, -5.5] },
  right: { label: 'ข้างบ้าน 2 · ฝั่งขวา', position: [12.6, 8, 5], target: [9.6, 1, -5.5] },
  rear: { label: 'ครัวและหลังบ้าน', position: [-18, 21, -31], target: [2, 1, -9.5] },
};

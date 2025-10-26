// เก็บข้อมูล 5 นาทีล่าสุดต่อคัน
const ring = new Map(); // id -> [{ts, lat, lng, speed, temp}]
const MAX = 5 * 60; // เก็บ ~300 จุด (ถ้าอัปเดตทุกวินาที)

function push(point) {
  const list = ring.get(point.id) ?? [];
  list.push(point);
  while (list.length > MAX) list.shift();
  ring.set(point.id, list);
}

function history(id, { from, to, limit = 300 }) {
  const list = ring.get(id) ?? [];
  if (!from && !to) return list.slice(-limit);
  const f = from ? +new Date(from) : -Infinity;
  const t = to ? +new Date(to) : Infinity;
  return list
    .filter((p) => +new Date(p.ts) >= f && +new Date(p.ts) <= t)
    .slice(-limit);
}

function metrics() {
  const now = Date.now();
  let count = 0,
    sumSpeed = 0,
    sumTemp = 0,
    totalDist = 0;

  for (const [id, list] of ring) {
    if (!list.length) continue;
    // active = อัปเดตใน 30 วิ
    if (now - +new Date(list[list.length - 1].ts) < 30_000) count++;

    // avg
    sumSpeed += list[list.length - 1].speed;
    sumTemp += list[list.length - 1].temp;

    // ระยะทางคร่าวๆ (polyline) เฉพาะ 24 ชม. ล่าสุด
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1],
        b = list[i];
      totalDist += haversine(a.latitude, a.longitude, b.latitude, b.longitude);
    }
  }
  return {
    activeTrucks: count,
    avgSpeed: count ? +(sumSpeed / ring.size).toFixed(1) : 0,
    avgTemp: ring.size ? +(sumTemp / ring.size).toFixed(1) : 0,
    distance24h: +totalDist.toFixed(1),
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { push, history, metrics };

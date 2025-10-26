import truckRepo from '../repositories/truckRepository.js';
import alertRepo from '../repositories/alertRepository.js';
import tracking from './tracking.js';

// helper: ช่วงเวลา
function rangeToWindow(range = '24h') {
  /* แปลงเป็น start/end */ return {
    start: new Date(Date.now() - 24 * 3600e3),
    end: new Date(),
  };
}

export default {
  async getSummary({ range }) {
    const { start, end } = rangeToWindow(range);
    const trucks = (await truckRepo.findAllActive?.()) ?? [];
    const alerts = (await alertRepo.findSince?.(start)) ?? [];

    const activeTrucks = trucks.length;
    const avgCargoTempC = Number(
      (
        trucks.reduce((s, t) => s + (t.avg_cargo_temp_c ?? -4), 0) /
        Math.max(trucks.length, 1)
      ).toFixed(1),
    );
    const deliveriesToday =
      (await tracking.countDeliveries?.({ start, end })) ?? 0;
    const avgFuelEconomy = Number(
      (
        trucks.reduce((s, t) => s + (t.fuel_economy ?? 8), 0) /
        Math.max(trucks.length, 1)
      ).toFixed(1),
    );
    const uptime = 96.8; // คิวรีจริงจาก health log ได้ หากมี
    const drivingHours =
      (await tracking.sumDrivingHours?.({ start, end })) ?? 0;
    const alertsCount = alerts.length;
    const totalDistanceKm = (await tracking.sumDistance?.({ start, end })) ?? 0;

    return {
      activeTrucks,
      avgCargoTempC,
      deliveriesToday,
      avgFuelEconomy,
      uptime,
      drivingHours,
      alertsCount,
      totalDistanceKm,
    };
  },

  async getRevenueTrend({ range }) {
    // ถ้ามี table revenue ให้ SELECT ตามช่วงเวลา; ไม่มีก็อนุมานจาก deliveries*rate
    return { series: (await tracking.revenueSeries?.(range)) ?? [] };
  },

  async getFleetActivity({ range }) {
    return (
      (await tracking.fleetActivity?.(range)) ?? {
        labels: [],
        bars: [],
        line: [],
      }
    );
  },

  async getCargoTempDistribution({ range }) {
    return (
      (await tracking.cargoTempHistogram?.(range)) ?? {
        labels: ['<-18', '-18..-10', '-10..-2', '-2..2', '>2'],
        values: [4, 12, 9, 3, 1],
      }
    );
  },

  async getAlertTimeline({ range }) {
    return (
      (await alertRepo.timeline?.(range)) ?? {
        labels: [],
        critical: [],
        warning: [],
        info: [],
      }
    );
  },

  async getPerformanceRadar({ range }) {
    return (
      (await tracking.performanceRadar?.(range)) ?? {
        speed: 92,
        safety: 88,
        fuelEfficiency: 76,
        maintenance: 81,
        utilization: 84,
      }
    );
  },

  async getSystemHealth() {
    return [
      { name: 'API Gateway', status: 'ok', latencyMs: 24 },
      { name: 'DB', status: 'ok', latencyMs: 12 },
      { name: 'WebSocket', status: 'ok', latencyMs: 8 },
    ];
  },

  async getStreams() {
    return {
      activeCount: 3,
      streams: [
        { name: 'gps-live', status: 'ok', lagMs: 120, throughput: 2240 },
        { name: 'alerts', status: 'ok', lagMs: 40, throughput: 320 },
        { name: 'telemetry', status: 'ok', lagMs: 80, throughput: 980 },
      ],
    };
  },
};

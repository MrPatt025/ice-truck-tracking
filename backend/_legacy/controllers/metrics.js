import svc from '../services/metricsService.js';

export async function getSummary(req, res, next) {
  try {
    res.json(await svc.getSummary(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getRevenueTrend(req, res, next) {
  try {
    res.json(await svc.getRevenueTrend(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getFleetActivity(req, res, next) {
  try {
    res.json(await svc.getFleetActivity(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getCargoTempDistribution(req, res, next) {
  try {
    res.json(await svc.getCargoTempDistribution(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getAlertTimeline(req, res, next) {
  try {
    res.json(await svc.getAlertTimeline(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getPerformanceRadar(req, res, next) {
  try {
    res.json(await svc.getPerformanceRadar(req.query));
  } catch (e) {
    next(e);
  }
}
export async function getSystemHealth(req, res, next) {
  try {
    res.json(await svc.getSystemHealth());
  } catch (e) {
    next(e);
  }
}
export async function getStreams(req, res, next) {
  try {
    res.json(await svc.getStreams());
  } catch (e) {
    next(e);
  }
}

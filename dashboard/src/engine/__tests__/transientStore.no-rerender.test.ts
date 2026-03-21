import { useIoTStore, upsertTruckBatch } from '../store'

describe('transient telemetry updates', () => {
  it('does not trigger React-subscribed selectors on truck position updates', () => {
    const metricsSubscriber = jest.fn()

    const unsubscribe = useIoTStore.subscribe(s => s.metrics, metricsSubscriber)

    upsertTruckBatch([
      {
        id: 'truck-telemetry-001',
        lat: 13.7563,
        lng: 100.5018,
        speed: 52,
        heading: 145,
        temperature: -11.5,
        fuelLevel: 74,
        engineRpm: 1900,
        odometer: 125000,
        status: 'active',
        driverName: 'Test Driver',
        routeId: 'route-a',
        timestamp: Date.now(),
      },
    ])

    expect(metricsSubscriber).not.toHaveBeenCalled()

    unsubscribe()
  })
})

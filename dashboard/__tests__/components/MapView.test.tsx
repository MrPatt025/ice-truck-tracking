import { render, screen, fireEvent } from '@testing-library/react'
import { MapView } from '../../components/MapView'

const mockTrucks = [
  {
    id: '1',
    plate_number: 'ABC-123',
    latitude: 13.7563,
    longitude: 100.5018,
    status: 'active' as const,
    driver_name: 'John Doe',
  },
  {
    id: '2',
    plate_number: 'XYZ-789',
    latitude: 13.7600,
    longitude: 100.5100,
    status: 'inactive' as const,
    driver_name: 'Jane Smith',
  },
]

const mockGeofences = [
  {
    id: '1',
    name: 'Warehouse Zone',
    coordinates: [[100.5000, 13.7500], [100.5050, 13.7500], [100.5050, 13.7550], [100.5000, 13.7550]] as [number, number][],
    type: 'allowed' as const,
  },
]

describe('MapView', () => {
  const mockOnSelectTruck = jest.fn()

  beforeEach(() => {
    mockOnSelectTruck.mockClear()
  })

  it('renders map container', () => {
    render(
      <MapView
        trucks={mockTrucks}
        geofences={mockGeofences}
        selectedTruck={null}
        onSelectTruck={mockOnSelectTruck}
      />
    )

    expect(screen.getByText('Active (1)')).toBeInTheDocument()
    expect(screen.getByText('Inactive (1)')).toBeInTheDocument()
  })

  it('displays truck status counts correctly', () => {
    render(
      <MapView
        trucks={mockTrucks}
        geofences={mockGeofences}
        selectedTruck={null}
        onSelectTruck={mockOnSelectTruck}
      />
    )

    expect(screen.getByText('Active (1)')).toBeInTheDocument()
    expect(screen.getByText('Inactive (1)')).toBeInTheDocument()
  })

  it('shows geofence legend', () => {
    render(
      <MapView
        trucks={mockTrucks}
        geofences={mockGeofences}
        selectedTruck={null}
        onSelectTruck={mockOnSelectTruck}
      />
    )

    expect(screen.getByText('Allowed Zones')).toBeInTheDocument()
    expect(screen.getByText('Restricted Zones')).toBeInTheDocument()
  })

  it('displays connection status', () => {
    render(
      <MapView
        trucks={mockTrucks}
        geofences={mockGeofences}
        selectedTruck={null}
        onSelectTruck={mockOnSelectTruck}
      />
    )

    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('handles empty trucks array', () => {
    render(
      <MapView
        trucks={[]}
        geofences={mockGeofences}
        selectedTruck={null}
        onSelectTruck={mockOnSelectTruck}
      />
    )

    expect(screen.getByText('Active (0)')).toBeInTheDocument()
    expect(screen.getByText('Inactive (0)')).toBeInTheDocument()
  })
})
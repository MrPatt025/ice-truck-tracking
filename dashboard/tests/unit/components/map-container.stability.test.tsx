import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import TomTomMap from '@/components/TomTomMap';

// Ensure external SDK is not required for this stability test
// TomTomMap renders a <div data-testid="map-container"/> regardless of SDK availability.

describe('TomTomMap stability', () => {
  it('keeps the same DOM node between prop updates (map stays mounted)', () => {
    const { rerender } = render(<TomTomMap trucks={[]} autoFit cluster />);
    const first = screen.getByTestId('map-container');

    // update props — should not unmount/remount
    rerender(
      <TomTomMap
        trucks={[{ id: 1, latitude: 0, longitude: 0 } as any]}
        autoFit
        cluster
      />,
    );
    const second = screen.getByTestId('map-container');

    expect(first).toBe(second);
  });
});

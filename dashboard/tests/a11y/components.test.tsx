import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import Modal from '@/ui/components/Modal';
import Tooltip from '@/ui/components/Tooltip';

describe('Accessibility Tests', () => {
  describe('Modal Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tooltip Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Tooltip content="Tooltip text">
          <button type="button">Trigger</button>
        </Tooltip>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

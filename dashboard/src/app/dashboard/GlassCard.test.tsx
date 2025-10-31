import { render, screen } from '@testing-library/react';
import { GlassCard } from './page';
import '@testing-library/jest-dom';

describe('GlassCard', () => {
  it('should not render a button wrapper when clickable', () => {
    const handleClick = jest.fn();

    const { container } = render(
      <GlassCard onClick={handleClick}>
        <div>Card content</div>
        <button>Inner action</button>
      </GlassCard>,
    );

    // The root element should NOT be a button
    const root = container.firstChild as HTMLElement;
    expect(root.tagName).not.toBe('BUTTON');
    expect(root.tagName).toBe('DIV');

    // Should have role="button" for accessibility
    expect(root).toHaveAttribute('role', 'button');
    expect(root).toHaveAttribute('tabindex', '0');
  });

  it('should have only one interactive element when clickable with inner button', () => {
    const handleClick = jest.fn();
    const handleInnerClick = jest.fn();

    const { container } = render(
      <GlassCard onClick={handleClick}>
        <div>Card content</div>
        <button onClick={handleInnerClick}>Inner action</button>
      </GlassCard>,
    );

    // Count actual button elements (not role="button")
    const buttons = container.querySelectorAll('button');

    // Should have exactly 1 button (the inner action button)
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Inner action');
  });

  it('should render as non-interactive div when no onClick provided', () => {
    const { container } = render(
      <GlassCard>
        <div>Static card content</div>
      </GlassCard>,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.tagName).toBe('DIV');
    expect(root).not.toHaveAttribute('role', 'button');
    expect(root).not.toHaveAttribute('tabindex');
  });

  it('should handle keyboard interaction (Enter/Space) when clickable', () => {
    const handleClick = jest.fn();

    render(
      <GlassCard onClick={handleClick}>
        <div>Card content</div>
      </GlassCard>,
    );

    const card = screen.getByRole('button');

    // Simulate Enter key
    card.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Simulate Space key
    card.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Other keys should not trigger
    card.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});

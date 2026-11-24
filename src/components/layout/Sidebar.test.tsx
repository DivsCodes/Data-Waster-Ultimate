import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

afterEach(() => cleanup());

describe('sidebar accessibility', () => {
  it('exposes separately named workspace and resource navigation landmarks', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getByRole('complementary', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /workspace navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /project resources/i })).toBeInTheDocument();
  });

  it('provides accessible names for all primary navigation links', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    for (const label of ['Dashboard', 'Laboratory', 'Analytics', 'Arcade', 'Customize', 'Desktop OS', 'Community', 'Tools & Dev Lab', 'About', 'Help Center', 'Privacy', 'Settings']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });
});

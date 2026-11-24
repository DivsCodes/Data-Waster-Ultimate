import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AboutPage } from './AboutPage';
import { HelpPage } from './HelpPage';
import { PrivacyPage } from './PrivacyPage';

afterEach(() => cleanup());

function renderPage(page: ReactNode) {
  return render(<MemoryRouter>{page}</MemoryRouter>);
}

describe('launch information pages', () => {
  it('explains the project scope and links to help and privacy', () => {
    renderPage(<AboutPage />);
    expect(screen.getByRole('heading', { name: /a playground for your connection/i })).toBeInTheDocument();
    expect(screen.getByText(/not a native operating system/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read the user guide/i })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: /privacy details/i })).toHaveAttribute('href', '/privacy');
  });

  it('provides practical transfer and browser troubleshooting guidance', () => {
    renderPage(<HelpPage />);
    expect(screen.getByRole('heading', { name: /quick answers, no guesswork/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /start a transfer/i })).toBeInTheDocument();
    expect(screen.getAllByText(/CORS/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute('href', '/');
  });

  it('describes local storage and external network requests', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: /your browser, your data/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /stored on this device/i })).toBeInTheDocument();
    expect(screen.getByText(/not encrypted as a secure vault/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /network requests/i })).toBeInTheDocument();
  });
});

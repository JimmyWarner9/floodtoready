import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatFeature } from './ChatFeature';
import { LanguageProvider } from './localization/LanguageProvider';

describe('wired demo chat', () => {
  it('escalates immediately without requesting the server', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<LanguageProvider initialLanguage="en"><ChatFeature /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Help me, I am trapped' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(screen.getByRole('link', { name: 'Call 999' })).toHaveAttribute('href', 'tel:999');
    expect(screen.getByRole('heading', { name: 'Need emergency help?' })).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retains cited demo guidance when the server fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<LanguageProvider initialLanguage="en"><ChatFeature /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'What emergency supplies should I prepare?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Retrieved guidance' })).toBeInTheDocument());
    expect(screen.getByText(/Server unavailable/)).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: /Disasters and Emergencies/ })) expect(link).toHaveAttribute('href', expect.stringContaining('https://'));
  });
});

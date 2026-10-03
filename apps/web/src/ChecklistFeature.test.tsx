import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChecklistFeature } from './ChecklistFeature';
import { LanguageProvider } from './localization/LanguageProvider';

describe('wired household plan', () => {
  it('personalises the plan and restores checked items after remount', () => {
    localStorage.clear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mount = () => render(<LanguageProvider initialLanguage="en"><ChecklistFeature /></LanguageProvider>);
    const first = mount();
    fireEvent.change(screen.getByLabelText(/Elderly members/), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText(/Mobility assistance needed/), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText(/Transport available/), { target: { value: 'false' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate my plan' }));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(5);
    const task = screen.getAllByRole('checkbox')[0];
    if (!task) throw new Error('Missing task');
    fireEvent.click(task);
    first.unmount();
    mount();
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getByLabelText(/Mobility assistance needed/)).toHaveValue('true');
    fireEvent.click(screen.getByRole('button', { name: 'Clear my data' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
  });
});

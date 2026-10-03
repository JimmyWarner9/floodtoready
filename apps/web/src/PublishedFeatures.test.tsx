import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { LanguageProvider } from './localization/LanguageProvider';
import { PublishedAssistant, PublishedChecklist } from './PublishedFeatures';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
describe('published source features',()=>{
 it('shows emergency calls without sending a question to a server',()=>{const network=vi.spyOn(globalThis,'fetch');render(<LanguageProvider initialLanguage="en"><PublishedAssistant/></LanguageProvider>);fireEvent.change(screen.getByLabelText('Your question'),{target:{value:'Help I am trapped'}});fireEvent.click(screen.getByRole('button',{name:/Find guidance/}));expect(screen.getByRole('alert')).toBeTruthy();expect(screen.getByRole('link',{name:'Call 999'}).getAttribute('href')).toBe('tel:999');expect(network).not.toHaveBeenCalled();});
 it('does not invent current shelter information',()=>{render(<LanguageProvider initialLanguage="en"><PublishedAssistant/></LanguageProvider>);fireEvent.change(screen.getByLabelText('Your question'),{target:{value:'Which shelter is open now?'}});fireEvent.click(screen.getByRole('button',{name:/Find guidance/}));expect(screen.getByText(/cannot verify current conditions/)).toBeTruthy();});
 it('keeps checked progress in memory without storage consent',()=>{render(<LanguageProvider initialLanguage="en"><PublishedChecklist/></LanguageProvider>);fireEvent.click(screen.getByLabelText('Prepare an emergency bag before a flood.'));expect(localStorage.getItem('banjirready-published-plan-v1')).toBeNull();expect(screen.getByRole('progressbar').getAttribute('value')).toBe('1');});
});

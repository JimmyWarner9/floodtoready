---
inclusion: always
---

# Accessibility safeguards

Treat accessibility as acceptance behavior for guidance, checklist, agency directory, chatbot, emergency, limitations, and print journeys. Target WCAG 2.2 AA; prefer semantic HTML before ARIA.

## Interaction and structure

- Use native controls and landmarks, one page heading, descriptive section headings, consistent navigation, and a working skip link.
- Every interactive control must be keyboard operable with a visible, unobscured focus indicator and a programmatic name. Expose correct role, state, instructions, required/invalid state, and error association.
- Primary mobile actions must have at least a 44 by 44 CSS-pixel target. Do not use drag, hover, gesture, color, or motion as the only way to operate or understand a feature.
- On emergency or ambiguous intent, place escalation before conversation in DOM order and move focus to its heading or validated contact action. Keep the persistent emergency action early in DOM/tab order.

## Updates and status

- Announce non-emergency dynamic updates through a polite live region. Announce emergency alerts and validation errors through an assertive live region without duplicative repeated announcements.
- Pair every guidance status, freshness state, demo label, error, checklist completion, provider state, and emergency color with visible text or a meaningfully named icon. Never communicate status by color alone.
- Keep `Demo Guidance / Panduan Demo`, `Demo Data / Data Demo`, stale timestamps, and not-current labels adjacent to the content they qualify in reading and focus order.
- Citation controls must expose expanded/collapsed state and source details in a logical reading order.

## Visual, responsive, motion, and language behavior

- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and essential interface graphics, including focus indicators and all states.
- At 320 CSS pixels and 200% browser zoom, reflow each primary journey into one-dimensional scrolling with no horizontal page scroll, clipping, overlap, or loss of content/function.
- Honor `prefers-reduced-motion` by removing non-essential animation while preserving every state change without motion dependence.
- Set document language to `ms` or `en` with the selected language. Do not silently substitute other-language safety content for a missing translation.
- Print order must match reading order; preserve visible URLs/contact numbers, labels, limitations, and clear checklist outlines.

## Verification

Use accessibility-first queries and test keyboard-only operation, focus order/restoration, names/roles/states/errors, polite/assertive announcements, 44px targets, token contrast, reduced motion, 320px/200% reflow, print reading order, and BM/English language metadata. Automated rules complement, but do not replace, keyboard and screen-reader spot checks.

Requirements: 15.1–15.10, plus emergency and label behavior from 12.4–12.5 and 18.1–18.7.

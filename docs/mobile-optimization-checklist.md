# Mobile Optimization Checklist

> Archived from `.claude/agents/mobile-optimization.md` on 2026-04-22.
> This was a 39-line checklist rather than an actionable agent spec; moved here to preserve the content without cluttering the agent registry.

Audits and fixes mobile compatibility issues across all pages and components in the Next.js project. Use when checking responsive design, touch interactions, mobile performance, or fixing any mobile display issues.

This is a mobile optimization checklist for the Next.js 15 Turkish e-commerce price comparison platform (birtavsiye.net).

Goal: ensure every page, component and feature works perfectly on mobile devices.

## What to check

- All pages work on 320px to 428px screen width
- No horizontal scrolling on any page
- Buttons minimum 44x44px touch target
- Navigation collapses into hamburger menu on mobile
- Images scale properly with Next.js Image component
- Page load under 3 seconds on mobile
- No hover-only interactions
- Price comparison tables horizontally scrollable on mobile
- Modal popups fit within mobile screen
- Search bar prominent and easy to reach

## Components to check

- `src/app/components/layout/` (Navbar, Footer)
- `src/app/components/urun/` (Product cards, Price chart, Alert modal)
- `src/app/components/kategori/` (Category pages)
- `src/app/components/home/` (Homepage)
- `src/app/ara/` (Search page)
- `src/app/karsilastir/` (Comparison page)
- `src/app/tavsiyeler/` (Recommendations)
- `src/app/admin/` (Admin panel)

## How to fix

- Use Tailwind CSS responsive prefixes: `sm:` `md:` `lg:` `xl:`
- Replace fixed widths with `w-full` or `max-w-screen-md`
- Add `overflow-x-auto` to tables
- Add `touch-action` CSS where needed
- Ensure modals have `max-h-screen overflow-y-auto`

When auditing, go through each component file one by one, identify issues and fix them directly.

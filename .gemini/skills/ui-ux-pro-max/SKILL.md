---
name: ui-ux-pro-max
description: UI/UX design intelligence with searchable database
---

## REQ

- Python 3.12+

## WORKFLOW

1. Requirements
2. CMD: `python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system [-p "Proj"] [--persist] [--page "slug"]`
3. Hierarchy: `design-system/pages/slug.md` > `design-system/MASTER.md`
4. Stack: Default html-tailwind

## ICONS

- SVG ONLY (Heroicons/Lucide/SimpleIcons)|NO emojis
- Stable hover (NO layout shift)
- Fixed viewBox 24x24|w-6 h-6

## INTERACTION

- `cursor-pointer` on interactive elements
- Clear hover feedback (color/shadow/border)
- Transitions: 150-300ms (`transition-colors duration-200`)

## CONTRAST (Light)

- Glass: `bg-white/80+` (NO `bg-white/10`)
- Text: `#0F172A`|Muted: `#475569`
- Border: `border-gray-200`

## LAYOUT

- Nav: Floating `top-4 left-4 right-4` (NO `top-0`)
- Pad content for nav height
- Container: `max-w-6xl/7xl`
- Mobile: ZERO horizontal scroll

## CHECKLIST

SVG Icons|Brand logos|cursor-pointer|Contrast >= 4.5:1|Responsive(375/768/1024/1440)|Alt text|Labels

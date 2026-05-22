# Matcha By Kamo Styles

## Brand Principles
- Keep the website quiet, refined, and restrained.
- Prefer calm typography, thin dividers, and breathing room over heavy cards and loud controls.
- Website pages should feel editorial and product-led. Admin pages can stay utilitarian.

## Website Tone
- Use lowercase for headings, tabs, nav items, labels, and helper copy unless a proper name requires capitalization.
- Keep copy short, soft, and direct.
- Avoid dashboard language on public pages.
- Avoid technical wording unless the page is explicitly operational.

## Typography
- Public page titles: light-to-regular weight, tight tracking, lowercase.
- Eyebrows and labels: small uppercase with wide letter spacing.
- Body copy: muted ink tone, medium line height, no marketing fluff.

## Layout Rhythm
- Use thin divider sections instead of bulky floating cards where possible.
- Prefer 2-column layouts only when one side clearly supports the other.
- Collapse to one column on tablet/mobile without leaving empty visual weight.
- Keep section gaps consistent: 1.5rem to 2.25rem on public pages.

## Actions
- Tabs and secondary actions should read like understated links with underline treatment.
- Reserve filled emphasis for clear submit actions only.
- Avoid oversized rounded buttons on public pages.

## Forms
- Public form fields should be simple, calm, and mostly border-bottom driven.
- Labels should be quiet and small.
- Validation and feedback should stay short and lowercase.
- Auth pages should not look like admin panels.

## Shared UI Patterns
- Reuse the mixins in `frontend/src/app/shared/styles/website-patterns.scss` for public pages.
- Prefer the shared page-title, intro-copy, section-rule, tab-button, field-input, and feedback patterns over one-off styling.

## Account Pages
- Signed-out state: simple access form with restrained copy.
- Signed-in state: lightweight home surface with profile summary and future-facing placeholders.
- Backend-dependent auth states should be designed visually now, but clearly labeled as pending.

## Admin Separation
- `/admin` is for staff and admin accounts only.
- Guests/customers should not see POS, clock in/out, or internal navigation.
- Staff/admin login should use staff code + PIN from HR-managed accounts.
- Public website account UI must stay separate from internal staff/admin access.

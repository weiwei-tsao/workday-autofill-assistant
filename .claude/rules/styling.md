# Styling

## Approach
Tailwind CSS utility classes directly in JSX. No CSS Modules, no styled-components, no separate stylesheet per component. `src/styles/` holds only the global Tailwind entry stylesheet.

## Component structure
Styles live inline as `className` on the elements they affect — do not extract style objects or separate `.css` files per component.

## Forbidden patterns
- No inline `style={{...}}` for layout — use Tailwind utility classes
- No `!important`
- No new CSS-in-JS libraries

Architecture details → see [[architecture]].

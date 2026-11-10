# Frithward design system

CSS tokens, primitives, and layouts for Frithward interfaces. The package is
private and consumed through the `@frithward/design-system` workspace alias.

## Import

Import the aggregate entry for an application shell:

```ts
import "@frithward/design-system";
```

Import individual layers when a bundle only needs one part:

```ts
import "@frithward/design-system/tokens/color.css";
import "@frithward/design-system/components/button.css";
import "@frithward/design-system/layouts/workspace.css";
import "@frithward/design-system/accessibility/base.css";
import "@frithward/design-system/icons/base.css";
```

The package exports `.`, `./tokens/*`, `./components/*`, `./layouts/*`,
`./accessibility/*`, and `./icons/*`. Every file is plain CSS with no build
step.

## Token categories

| File | Tokens | Use |
| --- | --- | --- |
| `tokens/color.css` | `--fw-color-canvas`, `--fw-color-surface`, `--fw-color-surface-secondary`, `--fw-color-overlay`, `--fw-color-text`, `--fw-color-text-secondary`, `--fw-color-border`, `--fw-color-border-strong`, `--fw-color-accent`, `--fw-color-accent-surface`, `--fw-color-accent-contrast`, `--fw-color-success`, `--fw-color-success-surface`, `--fw-color-warning`, `--fw-color-warning-surface`, `--fw-color-danger`, `--fw-color-danger-surface` | Every color. No literal colors in components. |
| `tokens/spacing.css` | `--fw-space-0-5` through `--fw-space-24` | Padding, gaps, and fixed control sizes. |
| `tokens/typography.css` | `--fw-font-sans`, `--fw-type-*`, `--fw-leading-*`, `--fw-weight-*` | Font family, sizes, line heights, weights. |
| `tokens/borders.css` | `--fw-border-width`, `--fw-border-selected`, `--fw-border-focus`, `--fw-radius`, `--fw-radius-pill` | Border widths and radii. |
| `tokens/geometry.css` | `--fw-layout-header`, `--fw-layout-sidebar`, `--fw-layout-inspector`, `--fw-layout-max`, `--fw-layout-gap`, `--fw-layout-pad`, `--fw-touch-min` | Shell dimensions and the 44px minimum touch target. |
| `tokens/motion.css` | `--fw-motion-*`, `--fw-easing-standard` | Transition durations and easing. |
| `tokens/elevation.css` | `--fw-elevation-none`, `--fw-elevation-popover`, `--fw-elevation-dialog` | Shadows for floating surfaces. |
| `tokens/components.css` | `--fw-component-input-height`, `--fw-component-dialog-radius`, `--fw-component-control-size`, `--fw-component-icon-size`, `--fw-component-progress-height` | Component-specific measurements that do not belong in the global scale. |

## Components

| Class | Element | Notes |
| --- | --- | --- |
| `.fw-button`, `.fw-button-primary`, `.fw-button-secondary`, `.fw-button-tertiary` | `button` | 44px minimum height. |
| `.fw-field` | `label`/`div` wrapping `input` and `hint` | Grid with `--fw-space-1` gap. |
| `.fw-select` | `select` | Native control, tokenized chrome. |
| `.fw-checkbox` | `label` wrapping `input[type=checkbox]` and `span` | Uses `accent-color`; no custom box to keep native keyboard behavior. |
| `.fw-alert`, `.fw-alert-success`, `.fw-alert-warning`, `.fw-alert-danger` | `div` | Semantic status colors. |
| `.fw-badge`, `.fw-badge-success`, `.fw-badge-warning`, `.fw-badge-danger` | `span` | Compact status label. |
| `.fw-dialog` | `section`/`div` | Elevated surface for modal content. |
| `.fw-popover` | `div` with optional `header` and `p` | Floating panel. |
| `.fw-nav` | `nav` | Buttons or links; `[aria-current="page"]` marks the active item. |
| `.fw-progress` > `.fw-progress-value` | `div` | Set the value width as a percentage. |
| `.fw-file-picker` | `label` wrapping a file `input` | Dashed drop target; keyboard focus lands on the input. |
| `.fw-table` | `table` | `.numeric` right-aligns numbers with tabular figures. |
| `.fw-icon` | `svg` | 20px square, 1.5 stroke width. |

## Layouts

| Class | Purpose |
| --- | --- |
| `.fw-shell` | Centered application shell with header, nav, and main regions. |
| `.fw-workspace` | Three-column workspace (sidebar, content, inspector) that collapses to one column below 1023px. |

## Theming

Light values are the defaults in `:root`. Add `data-theme="dark"` to `<html>`
to switch every semantic token:

```html
<html data-theme="dark">
```

Do not override individual component colors; add or change a token instead.

## Accessibility

- `:focus-visible` draws a 2px accent outline with a 4px offset.
- `prefers-reduced-motion` disables transitions and animations globally.
- `prefers-contrast: more` promotes the strong border color to `currentColor`.
- Interactive targets are at least 44px (`--fw-touch-min`).
- Use semantic colors for status, never color alone. Pair `.fw-alert-danger`
  with text, for example.

## Rules

1. Components reference tokens only. No literal colors, spacing, radii, or
   shadows in `components/` and `layouts/`.
2. A value that repeats across components becomes a token.
3. Media queries cannot read custom properties, so the workspace breakpoint
   stays a literal value with an explanatory comment.
4. `tokens/color.css` also defines legacy `--fw-*` aliases (`--fw-text`,
   `--fw-accent`, `--fw-border-strong`, and friends) so older stylesheets keep
   resolving. New code uses `--fw-color-*`.

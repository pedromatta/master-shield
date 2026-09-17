# MasterShield

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.14.

## Theming

The look and feel is defined in one place: **`src/styles.css`**.

- **Colours** are Tailwind v4 design tokens. The standard utility scales
  (`slate`, `sky`, `amber`, `emerald`, `rose`, `violet`) are *remapped* to the
  earthy tabletop palette inside the `@theme` block. Components keep using the
  normal utility names (`bg-slate-900`, `text-sky-300`, …), so re-skinning the
  whole app means editing those token values only.
- **Surfaces** are named layers so structure is decoupled from the raw palette:
  `bg-surface-base` (app backdrop), `bg-surface-panel` (windows, boards, side
  rails), `bg-surface-inset` (wells set into a panel) and `bg-surface-raised`
  (controls, rows, headers). They are deliberately opaque — solid carved boards
  rather than translucent "glass" panels.
- **Fonts** are self-hosted via `@fontsource` and exposed as `--font-display`
  (Cinzel, headings and window chrome), `--font-serif` (EB Garamond, body) and
  `--font-sans` (Inter, dense data).
- A few places need a concrete colour in TypeScript (new resource bars, tag
  defaults, low-health colour). Those live in
  **`src/app/core/theme/theme.ts`** and mirror the CSS tokens.

To change the theme, update the token values in `src/styles.css` (and the
matching literals in `theme.ts`).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# GCODE Explorer

A small browser app for reading GCODE alongside line-by-line explanations and a top-down preview. The preview uses an HTML Canvas to draw motion segments at the selected layer. The control pane below the table supports jumping to a line or Z layer and auto-playing through commands. A Web Worker indexes newline byte offsets in chunks, exposes each indexed section as it becomes available, and reads and explains only the visible line batches. The preview supports most commands, but arcs are not yet implemented.

## Run locally

```sh
npm install
npm run dev
```

## Deploy to GitHub Pages

The included GitHub Actions workflow builds and deploys the app to GitHub Pages
when changes are pushed to `main`, or when the workflow is manually run. In the
repository settings, set **Pages → Build and deployment → Source** to **GitHub
Actions**.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

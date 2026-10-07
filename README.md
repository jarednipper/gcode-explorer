# G-code Explorer

[G-code Explorer](https://jarednipper.github.io/gcode-explorer/)

A small browser app for reading G-code alongside line-by-line explanations and a top-down preview. The preview uses an HTML Canvas to draw motion segments at the selected layer. A Web Worker processes the file off the main thread to keep the UI responsive, making lines available as it goes and explaining only those currently visible on screen. The preview supports most commands, but arcs are not yet implemented.

## Run locally

```sh
npm install
npm run dev
```

## Deploy to GitHub Pages

The included GitHub Actions workflow builds and deploys the app to GitHub Pages
when changes are pushed to `main`, or when the workflow is manually run.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

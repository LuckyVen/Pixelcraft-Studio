# PixelCraft Studio

A local-first image editor built with React 19, TypeScript, Tailwind CSS, Lucide icons, and the HTML5 Canvas 2D API. Includes an original violet/cyan prism brand, a Photoshop-inspired editing workspace, and an editable alpine sample composition.

## Run locally

Install Node.js 22.13 or newer. In this folder:

```sh
npm install
npm run dev
```

Open the address printed by the development server (normally http://localhost:5173). `npm run build` creates the production app. `npx tsc --noEmit` checks the types. The committed pnpm lockfile is used for the hosted deployment; pnpm users can run `pnpm install` and `pnpm dev` instead.

The application is implemented as a Next-compatible React app using Vinext/Vite for deployment. No image-processing server, database, API key, account system, or paid API is needed. Hosting access is handled separately from the image editor.

## Editing

- Move, resize from the bottom-right transform handle, rotate, position, and reorder layers.
- Brush, pencil, eraser, clone sampling (Alt-click), basic healing, dodge, burn, and sponge.
- Rectangle/ellipse marquee, freehand/polygonal lasso, color-connected wand/quick selection, selection feathering and inversion.
- Rectangle, ellipse, polygon, and straight-segment Pen paths; saved paths can become selections.
- Editable multiline text with family, weight, size, tracking, line spacing, alignment, and color.
- Foreground/background swatches, color sampling, gradients, connected color fills, and crop.
- Visibility, locking, opacity, fill, nine blend modes, masks, and layer groups.
- Live nondestructive brightness, contrast, saturation, hue, blur, sharpness, and RGB color balance, on layers or adjustment layers.
- Local undo/redo with up to 35 document snapshots. Canvas pan, wheel and pinch zoom, view rotation, rulers, and grid.
- PNG, JPEG, WebP, SVG rasterization, PSD pixel-layer import, and native `.pixelcraft` projects.
- PNG/JPEG/WebP export at half, original, or double resolution. Native projects preserve layers.

## Smart tools and privacy

Background removal dynamically loads `@imgly/background-removal` and downloads its approximately 40 MB quantized model from IMG.LY on first use. Inference runs on the user's device. A network connection is needed for the initial model download. The original image layer is retained and hidden; the result is a new editable layer. This feature is wired to the real model, not a simulated preview.

Content-aware fill is a worker-based, deterministic boundary reconstruction and diffusion algorithm. It is useful for small holes and simple backgrounds. It is **not prompt-based generative AI** and does not create new semantic objects. No generative provider is connected.

Imported images, canvas data, and exported projects are not uploaded. There is no automatic session save: use File → Save project before closing the browser. The sample image is a bundled generated asset. Local image editing uses browser Canvas; GPU acceleration, where available, is managed by the browser, not a custom WebGL renderer.

## Limits

This is a practical browser editor, not full Photoshop feature parity. PSD support is limited to supported 8-bit RGB raster layers and groups; text is imported as its rendered pixels, and effects, advanced masks, smart-object behavior, CMYK, 16-bit, and PSB are not preserved. PSD files are limited to 64 MB and decoder memory to 256 MB. Document limits are 24 megapixels and 60 layers; raster placement is limited to 32 MB. Export is limited to 32 megapixels. Large documents and filters depend on device memory and speed.

Pen paths currently use straight segments. Healing is softened clone sampling. Quick selection uses connected-color tolerance. RGB channel toggles are preview-only. Rulers are a workspace orientation guide, not calibrated measurement during rotation. Group opacity is inherited per child (not isolated Photoshop group compositing). Transform controls resize from the bottom-right corner; the property panel provides exact width, height, position, and rotation. SVG imports become raster layers.

## Architecture

- `components/studio/Studio.tsx`: app state, menus, keyboard shortcuts, dialogs, local file workflows, optional WebMCP registration.
- `components/studio/Viewport.tsx`: pointer/touch interaction, painting, selections, transforms, and view navigation.
- `components/studio/Dock.tsx`: properties, live adjustments, history, layers, channels, and paths.
- `lib/studio/engine.ts`: compositing, bounded bitmap cache, document snapshots, transforms, masks, validation, and serialization.
- `lib/studio/pixels.ts`: flood selection, selection masks, sharpening, and content-aware reconstruction.
- `lib/studio/fill.worker.ts`: background content-aware computation.
- `lib/studio/io.ts`: lazy PSD import, local AI background removal, and image downloads.
- `app/globals.css`: responsive studio theme.

## Validation

TypeScript validation and production compilation are run before deployment. Direct Canvas engine checks cover pixels inside/outside selections, inverse selections, undo/redo, locked deletion, masks, nondestructive source preservation, crop/resize, native-project round trips, malformed files, content-aware fill, magic-wand selection, and history branching. The sample document is rendered for visual inspection. The environment did not provide browser UI automation or a supported WebMCP context; mouse/touch integration and first-run AI inference still require a browser smoke test. Sub-second startup across devices is not a verified guarantee.

## Open source

Licensed under GNU AGPL version 3. The full license is included in `LICENSE.md`. Download the corresponding source from Help → Download open-source code. React, Tailwind, Lucide, Radix/shadcn components, ag-psd, and the IMG.LY library retain their respective licenses. See `THIRD_PARTY_NOTICES.md`.

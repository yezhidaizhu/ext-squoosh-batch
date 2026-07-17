# Squoosh Batch – Bulk Image Workflow for Squoosh

Batch and bulk image upload workflow for [Squoosh.app](https://squoosh.app/).

Squoosh Batch adds a multi-image queue to Squoosh. Select multiple images once, then switch between them from the side panel while keeping Squoosh as the image editor and compressor.

## Features

- Select or drag multiple images into one batch queue.
- Use Squoosh's original upload button with multiple images; the extension captures the files into the batch queue.
- Browse images by thumbnail, filename, and file size.
- Click any queued image to make it the active image in Squoosh.
- Add, remove, or clear images without leaving Squoosh.
- Use Auto ZIP to process queued images one by one and download the right-side Squoosh outputs as a ZIP.
- Use the original Squoosh editing, compression, and download controls.
- Keep images in the browser. The extension does not upload them to a separate service.

## How It Works

1. Open [Squoosh.app](https://squoosh.app/).
2. Add multiple images through the Squoosh upload button, by dragging files onto the page, or from the Squoosh Batch panel.
3. Choose an image from the queue.
4. Edit and compress it with Squoosh.
5. Select the next image manually, or use Auto ZIP to apply the current Squoosh workflow across the queue.

Auto ZIP uses the right-side Squoosh output for each queued image. It is cancellable and depends on Squoosh finishing each image before the extension collects the output.

## Keywords

Squoosh batch, Squoosh bulk, bulk image compression, batch image compression, multiple image upload, compress multiple images, image compression queue.

## Development

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Disclaimer

Squoosh Batch is not affiliated with Google or Squoosh.

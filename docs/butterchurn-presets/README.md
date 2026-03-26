# Butterchurn Presets Reference

This folder contains reference material for whoever maintains the visualizer.

## Files

- `all-presets.json` — All 107 preset names available in `base.min.js` (JSON array)
- `presets-list.txt` — Same list, plain text (one per line)
- `screenshots/` — Visual reference for each preset (TODO: capture screenshots)

## Currently active preset

The app uses **only** `martin - witchcraft reloaded` as configured in `data.json`.

To change the active preset, edit `data.json` → `visualizer.activePreset` with any name from `presets-list.txt`.

## How to capture screenshots

1. Open the app and change `data.json` to cycle through presets
2. Or modify `app-viz.js` temporarily to load each preset
3. Take screenshots with browser dev tools or any screenshot tool
4. Save in `screenshots/` with the preset name as filename (sanitize special chars)

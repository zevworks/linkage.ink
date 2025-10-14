# Adding Presets

This guide explains how to add new presets to the linkage simulator.

## Quick Start

1. **Create your linkage** in the simulator
2. **Click "Copy Link"** to get the state URL
3. **Add entry to `presets.config.json`**
4. **Add thumbnail image** to `public/presets/` folder

## Step-by-Step Guide

### 1. Get the State URL

1. Open the simulator and create your desired linkage configuration
2. Click the **"Copy Link"** button in the menu
3. The URL will be copied to your clipboard
4. Extract just the hash part (everything including and after the `#`)

Example URL:
```
https://linkage.ink/#ax=0&ay=0&cl=100&ct=0&r1l=150&r1t=1&r1gx=200&r1gy=0&ox=400&oy=300&z=0.8
```

Extract this part:
```
#ax=0&ay=0&cl=100&ct=0&r1l=150&r1t=1&r1gx=200&r1gy=0&ox=400&oy=300&z=0.8
```

### 2. Add to Config File

Open `presets.config.json` and add a new entry:

```json
{
  "id": "my-preset",
  "name": "My Preset Name",
  "description": "Short description of what this preset does",
  "thumbnail": "my-preset.png",
  "stateUrl": "#ax=0&ay=0&cl=100..."
}
```

**Fields:**
- `id`: Unique identifier (lowercase, use hyphens)
- `name`: Display name shown in the UI
- `description`: Brief description shown in the UI
- `thumbnail`: Image filename (must match file in `public/presets/`)
- `stateUrl`: The complete state URL hash (including the `#`)

### 3. Add Thumbnail Image

1. Take a screenshot of your linkage
2. Crop/resize to approximately 400x240 pixels (5:3 aspect ratio)
3. Save as PNG or JPG
4. Place in `public/presets/` folder
5. Name must match the `thumbnail` field in config

Example:
```
public/presets/my-preset.png
```

### 4. Build and Test

```bash
npm run build
npm run dev
```

Open the simulator and check that your preset appears in the left sidebar!

## Example Config Entry

```json
{
  "id": "spiral-pattern",
  "name": "Spiral Pattern",
  "description": "Four-rod linkage creating a spiral",
  "thumbnail": "spiral-pattern.png",
  "stateUrl": "#ax=0&ay=0&cl=80&ct=0&cfr=0&r1l=140&r1t=0&r1fr=0&r1gx=150&r1gy=0&r2l=100&r2t=0&r2fr=0&r2gx=80&r2gy=-120&r3l=110&r3t=1&r3fr=0&r3gx=-50&r3gy=-80&ox=400&oy=300&z=0.6&tc=%2300FF96&tw=4&rw=4&f=1&s=0&inv=0"
}
```

## Tips

- Keep descriptions short (under 50 characters)
- Use descriptive, memorable names
- Thumbnails should be clear and show the complete pattern
- Test your preset loads correctly before committing
- The `id` must be unique across all presets

## Troubleshooting

**Preset doesn't appear:**
- Check JSON syntax is valid (use a JSON validator)
- Ensure thumbnail file exists and filename matches exactly
- Check browser console for error messages

**Preset loads wrong configuration:**
- Verify the state URL hash is complete and correct
- Make sure you copied the entire hash including the `#`

**Thumbnail doesn't show:**
- Confirm file is in `public/presets/` folder
- Check filename matches exactly (case-sensitive)
- Ensure image format is PNG or JPG

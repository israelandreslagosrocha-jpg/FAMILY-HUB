---
name: apple-icon-composer
description: Author, compose, and validate Apple Icon Composer `.icon` packages (Liquid Glass icon compositions for iOS, iPadOS, macOS, watchOS, and visionOS). Use this whenever the user asks to generate app icons, scaffold `.icon` packages, set up light/dark/tinted appearance variants (specializations), adjust layer fills, blend modes, shadows, translucency, or validate icon assets against Apple standards.
---

# 🍏 Apple Icon Composer `.icon` Skill

This skill provides comprehensive instructions, structure, and guidelines to author, customize, and validate Apple Icon Composer `.icon` packages and app icon assets for iOS, iPadOS, macOS, watchOS, and visionOS applications following Apple Human Interface Guidelines (HIG).

---

## 📐 1. Package Structure of `.icon`

An Apple `.icon` package is a macOS document directory package containing:
1. `icon.json`: Declarative JSON document defining layers, groups, fills, specializations (light/dark/tinted variants), shadows, and translucency.
2. `Assets/`: Directory containing source PNG/SVG image assets referenced in `icon.json`.

```
AppIcon.icon/
├── icon.json
└── Assets/
    ├── icon-light.png
    ├── icon-dark.png
    └── icon-tinted.png
```

---

## 🎨 2. Key Concepts & Appearance Specializations

### Appearance Variants (Specializations)
Apple icon packages support appearance overrides for:
- **Light Appearance** (`"appearance": "light"`)
- **Dark Appearance** (`"appearance": "dark"`)
- **Tinted Appearance** (`"appearance": "tinted"`)

### Fills & Blends
Layers inside `icon.json` support:
- `solid`: Single color hex (e.g. `"#3b82f6"`).
- `linear-gradient`: Multi-stop angle gradients.
- `automatic-gradient`: Native system accent gradient.

### Blend Modes & Shadows
- `blend-mode`: `normal`, `multiply`, `screen`, `overlay`, `soft-light`, `hard-light`, `color-dodge`, `color-burn`.
- `shadow.kind`: `neutral`, `layer-color`, `none`.

---

## 🛠️ 3. Authoring `icon.json` Template

```json
{
  "groups": [
    {
      "fill": {
        "solid": "#090d16"
      },
      "layers": [
        {
          "image-name": "icon-light.png",
          "image-name-specializations": [
            {
              "appearance": "dark",
              "value": "icon-dark.png"
            },
            {
              "appearance": "tinted",
              "value": "icon-tinted.png"
            }
          ],
          "position": {
            "scale": 1.0,
            "translation": [0, 0]
          }
        }
      ]
    }
  ]
}
```

---

## 🧪 4. Validation Rules

- **Schema Check**: Ensure JSON keys use exact camelCase/hyphenated keys (`image-name`, `image-name-specializations`, `solid`, `linear-gradient`).
- **Asset Integrity**: All referenced `image-name` strings must exist inside the `Assets/` directory.
- **Squircular Mask**: Icons adapt automatically to Apple squircular corner radii (`border-radius: 22.5%`).

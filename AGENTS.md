# AGENTS.md

Guidance for AI agents working in this repository. Keep changes focused, predictable, and aligned with the compositor’s rules.

## Project Snapshot
- Appshot is a CLI that composes App Store screenshots using sharp.
- Core layout lives in `src/core/compose.ts` (caption/device placement), frame selection in `src/core/frames-loader.ts` + `src/core/devices.ts`.
- Templates (human‑friendly presets) are in `src/templates/registry.ts` and get merged via `applyTemplateToConfig`.

## Layout Invariants (v0.9.0)
These are the source‑of‑truth rules used by the compositor:

- Device basis: All positioning uses the full frame image (the entire device). The screenshot is inset into `screenRect` only.
- Overlay:
  - Bottom‑anchored by the caption’s outer box (text + `background.padding` + border stroke). Explicit `0` values are respected.
  - Bottom spacing source: `caption.box.marginBottom` if set, else `caption.paddingBottom`, else `60`.
  - Increasing `fontsize` grows the box upward; the bottom edge stays anchored.
- Above / Below:
  - Caption and device remain fully on‑canvas. Caption sits truly above/below the device.
  - A minimum optical gap is enforced when `marginTop` is not provided (12px or half the border width, whichever is larger). If `marginTop` is explicitly set, it wins—even `0`.
  - Below caption position is: `max(bottomAnchorTop, deviceBottom + marginTop)` so the caption anchors to the bottom by default and moves down only if the device intrudes.
  - The caption box anchors at the top of its reserved area by default (unless `verticalAlign` is explicitly set).
- Watch specifics:
  - Fonts for watch are capped to `min(36, baseFontSize)` for readability.
  - “Device” includes bands; “below” means below the band, not just the watch face.
- Scale semantics:
  - User‑provided `frameScale` is always applied against the full output height (scale stays meaningful). The compositor adapts placement to maintain ordering; do not silently shrink the device unless explicitly required elsewhere.

## Template + Config Precedence
- Per‑device overrides win over global caption settings: `devices.<name>.captionSize || caption.fontsize`.
- Template applier uses nullish coalescing (`??`) so explicit zeros are honored. If a template does not provide a per‑device `captionSize`, existing device‑level `captionSize` is cleared so the template’s `caption.fontsize` takes effect.

## Frames
- `frames/Frames.json` defines frames. The registry stores:
  - `frameWidth`/`frameHeight`: full device image bounds
  - `screenRect`: the inset area where the screenshot is placed
  - `deviceType`: `iphone` | `ipad` | `mac` | `watch`
- Auto‑selection picks the closest `screenRect` aspect ratio for a given screenshot. A 10% mismatch warning is logged.

## Where to Change What
- Device/caption math: `src/core/compose.ts`
- Template defaults and device overrides: `src/templates/registry.ts`
- Frame selection/metadata: `src/core/frames-loader.ts` and `src/core/devices.ts`
- Build messaging / user notices: `src/commands/build.ts`

## Debugging Placement
- Run `appshot build --dry-run --verbose` to print chosen frame, frame/device dimensions, and key layout positions (`deviceTop`, `deviceBottom`, `captionTop`).
- For overlay, verify bottom spacing source (`caption.box.marginBottom` → `caption.paddingBottom`).
- For below on watch, check that `deviceBottom` includes bands (it does) and that `marginTop` is set if you want visible breathing room.

## Style Guidance for Agents
- Don’t change API shape unless requested. Keep new behavior behind small, well‑named switches if you must.
- Prefer single‑point fixes in `compose.ts` over template scatter.
- Update README/CHANGELOG when layout behavior changes.
- Keep tests deterministic; avoid time/locale dependencies.

## Release Notes Context (v0.9.0)
- Overlay anchoring uses the outer box; zeros are respected.
- Above/Below enforce a small optical gap and remain on‑canvas; visuals may differ from 0.8.x near device edges.
- Template fontsize precedence fixed so global sizes apply unless a device override sets `captionSize`.

## Useful Commands
```bash
npm run build           # compile TypeScript
npm run dev -- build    # run CLI in dev mode: appshot build
appshot build --dry-run --verbose  # print layout decisions
```


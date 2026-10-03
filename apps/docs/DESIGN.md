---
name: BAO Toolkit
description: A pixel-teal developer toolkit with readable code, source audits, and inspectable transaction evidence.
colors:
  canvas: "#001619"
  surface: "#0b2325"
  border: "#275355"
  text-main: "#e0f8f7"
  text-muted: "#9ec2c2"
  accent-bg: "#103235"
  accent: "#27d8c9"
  accent-ink: "#042323"
  frame-line: "#83dedb"
  hover-mint: "#8bece4"
  pixel-teal: "#107977"
  pastel-red-bg: "#3f252b"
  pastel-red-text: "#ffb9b4"
  pastel-green-bg: "#153c37"
  pastel-green-text: "#83e2d0"
  pastel-yellow-bg: "#3b3423"
  pastel-yellow-text: "#f3d798"
  workspace-ground: "#899798"
  workspace-canvas: "#aebbb9"
  workspace-border: "#516163"
  workspace-accent: "#f0d77c"
  workspace-accent-hover: "#ffe89d"
  workspace-rail: "#9aa9a8"
  activity-panel: "#c6ceca"
  activity-panel-deep: "#29363b"
  activity-paper: "#e0e7dc"
  activity-ink: "#253237"
  activity-rule: "#748582"
  activity-muted: "#415255"
  activity-link: "#29483d"
  activity-wallet: "#dde3d7"
  activity-success: "#bccabd"
  activity-fee: "#b5c3c6"
typography:
  display:
    fontFamily: '"BAO Block", "Pixelify Sans", monospace'
    fontSize: "6.95cqw"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: '"Pixelify Sans", monospace'
    fontSize: "clamp(42px, 4.45vw, 72px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  docs-headline:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "clamp(36px, 4.3vw, 60px)"
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-0.025em"
  tool-headline:
    fontFamily: '"Pixelify Sans", monospace'
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-copy:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  code:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.8
  input:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  action:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.6
  text-action:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.6
  navigation:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.1
  activity-headline:
    fontFamily: '"Pixelify Sans", monospace'
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  activity-metric:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  activity-ledger-headline:
    fontFamily: '"Pixelify Sans", monospace'
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  square: "0px"
spacing:
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
  "48": "48px"
  "56": "56px"
  "64": "64px"
  "80": "80px"
  "112": "112px"
  activity-gap: "14px"
  activity-compact-gap: "10px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.hover-mint}"
    textColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.square}"
    padding: "9px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.accent-bg}"
  text-action:
    textColor: "{colors.accent}"
    typography: "{typography.text-action}"
  input:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.text-main}"
    typography: "{typography.input}"
    rounded: "{rounded.square}"
    padding: "10px 14px"
    width: "100%"
  input-focus:
    backgroundColor: "{colors.surface}"
  candidate-tag:
    textColor: "{colors.accent}"
    rounded: "{rounded.square}"
    padding: "0.1em 0.65em"
  tool-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.square}"
    padding: "24px"
  command-copy:
    textColor: "{colors.text-main}"
    rounded: "{rounded.square}"
    padding: "0 12px"
  navigation:
    textColor: "{colors.text-main}"
    typography: "{typography.navigation}"
    rounded: "{rounded.square}"
  navigation-start:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  source-example:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.square}"
  activity-panel:
    backgroundColor: "{colors.activity-panel}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.square}"
    padding: "0"
  activity-total:
    backgroundColor: "{colors.activity-panel-deep}"
    textColor: "{colors.workspace-accent}"
    typography: "{typography.activity-metric}"
    rounded: "{rounded.square}"
    padding: "20px 16px 16px"
  activity-wallet:
    backgroundColor: "{colors.activity-wallet}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.square}"
    padding: "20px 16px 16px"
  activity-fee:
    backgroundColor: "{colors.activity-fee}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.square}"
    padding: "20px 16px 16px"
  activity-success:
    backgroundColor: "{colors.activity-success}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.square}"
    padding: "20px 16px 16px"
  activity-window-title:
    backgroundColor: "{colors.activity-panel-deep}"
    textColor: "{colors.activity-paper}"
    typography: "{typography.activity-ledger-headline}"
    padding: "10px 14px"
  activity-button-primary:
    backgroundColor: "{colors.workspace-accent}"
    textColor: "{colors.activity-ink}"
    rounded: "{rounded.square}"
    padding: "8px 14px"
    height: "44px"
---

# Design System: BAO Toolkit

## Overview

**Creative North Star: "Pixel construction set"**

BAO Toolkit uses a dark petrol canvas, teal surfaces, seafoam actions, and mint lettering. The approved world combines a static pixel planet, carved cyan rock fragments, front-facing pixel architecture, stepped outlines, and square interface parts. Crisp graphics and large pixel headings establish the identity; explanations, controls, and evidence remain readable.

The petrol and teal palette connects the homepage and documentation guides. The shared tool workspace adopts the user's 2026-10-03 pixel-desktop reference: ash-grey ground, graphite window strips, pale interiors, and warm yellow actions. Activity, Evidence, Doctor, Proofs, B20, and Wallets share this workspace, including proof details and B20 guides and reports. Local fonts connect both worlds. The homepage has generous chapter spacing and expressive display type. Guides use a quieter reading hierarchy, and tools use compact forms, code, and data. Their different densities are intentional; a guide or evidence table does not inherit the homepage's absolute composition.

**Key Characteristics:**

- Authored BAO Block hero lettering, Pixelify chapter headings, Space Grotesk explanations, and JetBrains Mono commands.
- Flat petrol and teal surfaces, thin rules, and square shared controls.
- A static pixel planet, the BAO pixel mark, and irregular rocky fragments on a clean, grid-free canvas.
- Direct aiming, building, beacon, and excavation controls in the homepage scenes and footer workshop.
- Text labels and provenance beside status colors, examples, and evidence.

Extracted from [global tokens](app/globals.css), [homepage styles](app/home.css), [shared site styles](app/_components/site.css), [guide styles](app/docs/docs.css), [font declarations](app/layout.tsx), [meteor behavior](app/_components/meteor-scene.tsx), [carved rock geometry](app/_components/meteor-rock.ts), [chapter constructions](app/_components/pixel-construction.tsx), and [footer workshop](app/_components/footer-builder.tsx). The [shared tool workspace](app/dashboard/workspace.css) and [app activity dashboard](app/dashboard/activity.css) supply the workspace- and activity-prefixed local tokens. The [Doctor](app/dashboard/doctor-workspace.css), [Evidence](app/dashboard/evidence-workspace.css), [Proofs and Wallets](app/dashboard/reference-workspace.css), and [B20](app/b20/workspace.css) adapters apply the same palette to each tool's controls and evidence.

## Colors

The palette moves from deep petrol through teal to seafoam and mint, with muted cyan copy and warm semantic feedback. Frontmatter records the implemented values; sidecar tonal ramps are synthesized palette previews, not additional shipped tokens.

Cyan rock crust, dark cavities, amber windows, and yellow excavator details are local artwork colors. They do not extend the shared action or status palette.

### Primary

- **Seafoam accent** (accent): filled actions, links, selection, focus outlines, active comparison buttons, and footer excavation controls.
- **Hover mint** (hover-mint): the brighter hover state of primary actions and start links.
- **Petrol action ink** (accent-ink): dark lettering on seafoam fills.

### Secondary

- **Frame mint** (frame-line): the recurring homepage perimeter, caption and quickstart outlines, module-rail separators, and stroke icons.
- **Pixel teal** (pixel-teal): local teal in construction artwork and footer controls. The planetary raster and cyan-crusted meshes carry their own authored tonal variation.
- **Workspace yellow** (workspace-accent): tool workspace primary actions, selected periods and chart controls, selected daily bars, and the operation total. Workspace-accent-hover supplies the primary hover state.

### Tertiary

- **Review red** (pastel-red-bg / pastel-red-text): failing findings and missing evidence.
- **Protected green** (pastel-green-bg / pastel-green-text): protected paths and corrected examples.
- **Caution amber** (pastel-yellow-bg / pastel-yellow-text): unresolved paths, testnet context, and the illustrative before state.

### Neutral

- **Deep petrol** (canvas): page ground, clean space around pixel artwork, and the resting hero image ground.
- **Dark teal surface** (surface): code examples, tool panels, and the final start panel.
- **Inset teal** (accent-bg): input fields, line-number gutters, metric strips, and selected tool areas.
- **Teal rule** (border): separators, field strokes, and quiet panel boundaries.
- **Mint ice** (text-main): main copy and display text. The source's text-accent alias resolves to the same value.
- **Muted cyan** (text-muted): explanations, captions, metadata, and secondary navigation.
- **Workspace ash** (workspace-ground / workspace-canvas / workspace-rail): outer tool-workspace ground, framed workspace, and labelled tool rail. Workspace-border defines field strokes.
- **Activity grey and graphite** (activity-panel / activity-panel-deep): pale window interiors with dark title strips, operation total, and daily chart. Activity-rule separates rows.
- **Activity paper and ink** (activity-paper / activity-ink / activity-muted): light fields, dark copy, and secondary explanations. Activity-link supplies readable links on pale panels.
- **Metric fills** (activity-wallet / activity-success / activity-fee): quiet pale variations behind wallet, execution-ratio, and gas measurements. These roles stay within the dashboard workspace.

**The Status With Words Rule.** Color accompanies a specific status, finding, or scope label. It does not replace the explanation.

## Typography

**Hero Font:** BAO Block, Bold style, with Pixelify Sans and monospace fallback.
**Display Font:** Pixelify Sans, with monospace fallback.
**Body Font:** Space Grotesk, with sans-serif fallback.
**Code Font:** JetBrains Mono, with monospace fallback.

All four families load from local font files through the root layout. The authored BAO Block Bold face is reserved for the live hero headline; its [bitmap source](assets/fonts/build_bao_block.py) carries the repository's MIT license. Pixelify is declared with a 400–700 weight range and uses 700 for chapter headings, short outcomes, and footer display. The large pixel type and smooth reading type serve different jobs.

### Hierarchy

- **Display:** the desktop hero uses BAO Block Bold in its inline-size container, with zero tracking. The first line uses the display token's default size; KNOW WHAT overrides it to 6.21cqw and SHIPPED to 6.8cqw. Individually positioned spans use horizontal scales of 0.874, 0.955, and 0.883 to preserve the approved widths. At 1200px and below they enter normal flow, lose those transforms, and use clamp(24px, 8.2cqw, 72px) with a parent line height of 1.1.
- **Headline:** homepage chapter headings use the headline token. The footer shares its size, weight, and tracking with a line height of 1.1. Below the small-screen breakpoint, homepage and footer headings use 42px.
- **Docs headline:** guide and documentation titles use Space Grotesk, balanced wrapping, and the docs-headline token. Small-screen titles use 36px. Guide section headings are 28px/1.3 at weight 500 and become 25px on small screens.
- **Tool headline:** shared tool pages use Pixelify at 36px/1.12 and weight 600, becoming 30px at 680px. Evidence uses 36px/1.12; B20 uses 40px/1.08 and becomes 34px at 680px. Window headings use local Pixelify sizes of 19–25px; explanatory copy and data retain their reading and mono families.
- **Activity display:** `/dashboard` uses activity-headline for its page title (34px on small screens) and activity-ledger-headline for window headings. All four measured values use JetBrains Mono; the primary total is yellow on graphite.
- **Title:** evidence-ledger headings use the title token. Documentation index headings use 25px/1.4 at weight 500; compact tool headings use 16–18px and weight 600.
- **Body:** the base body token is for controls and compact interface copy. Homepage and footer explanations use body-copy; homepage paragraphs cap at 70ch. Guides use 17px/1.8, cap at 72ch, and become 16px/1.75 on small screens. Introductory guide copy uses 20px/1.6 and becomes 18px.
- **Code:** examples use the code token; guide command blocks use 13px/1.9. Compact fields use the input token. Small-screen code becomes 12px where explicitly styled. Activity measurements use activity-metric, shrinking to 36px at 1150px and 30px at 680px. Long values use 32px, then 24px on small screens. Gas uses 32px/1.5, 26px at 1150px, and 20px at 680px; long gas strings use 26px, 22px, and 20px respectively. Success percentages, outcome counts, fees, hashes, and table data retain JetBrains Mono and tabular figures. Attribution evidence totals remain mono.
- **Actions and navigation:** use the action, text-action, and navigation roles. Desktop homepage navigation uses mono type with 13px and 14px minimums; the quickstart title has a 16px minimum and its command a 12px minimum. Caption copy has a 14px minimum. The shared mobile menu uses fixed readable sizes.

**The Readable Evidence Rule.** Keep paragraph text, editable code, commands, hashes, and table data in the reading or code families. Pixel type belongs to the shipped display and short outcome treatments.

## Layout

The desktop homepage hero is a composition container with aspect ratio 1672 / 941. Its stepped perimeter, offset title, right-hand planet, lower-left fragments, caption panel, quickstart, and four-part module rail use percentages and container units. These positions belong to this homepage surface, not to every future page.

Homepage chapters and the footer center within 92% width and a 1500px maximum. Major chapters use two unequal columns with 7–8% gaps and 80px vertical padding; the introduction, B20 chapter, and final start panel have their own spacing. The module rail supplies the module index without a repeated overview chapter. An Integrate → Audit and enforce → Verify and retain list introduces the workflow, and an annotated published transaction sits beside the evidence ledger. Thin horizontal rules separate the page.

The retained tool container has a 1440px maximum and 24px side padding; documentation reduces the maximum to 1400px. Guide articles use an 850px first column with a secondary column of at least 200px, separated by an 8% gap. Their table of contents sticks 32px from the top. The document has no forced minimum width; the narrow layout fits the space remaining inside a 320px viewport with a scrollbar.

Spacing tokens collect recurring measured steps from 8px control gaps through 112px chapter padding. They describe existing usage rather than a newly imposed mathematical scale.

The shared tool workspace has a 1680px maximum, a graphite header, an 86px labelled tool rail, and 24px 28px content padding. Within Activity, the data-source window and project scope lead into four equal measurement windows with 14px gaps. Beneath them, the wide dark daily chart spans three columns and execution results occupy the fourth. Destinations and attribution form two equal columns above the operations ledger. Window title strips and interiors have separate padding; metric interiors use 20px 16px 16px.

### Responsive behavior

- **1200px and below:** the shared header switches to a native disclosure menu. The hero drops its fixed ratio, puts copy and actions into flow, and uses a two-column module rail. A readable product definition follows the headline; quickstart comes before the detailed caption. Homepage chapters and the footer become single columns; major chapter padding remains 80px.
- **900px and below:** guides become one column. The desktop contents navigation gives way to an in-guide disclosure; the related-guide area becomes static. Proof layouts also collapse at this breakpoint.
- **600px and below:** homepage and footer side gutters become 20px, the hero caption stacks, the module rail becomes one column, major chapter padding becomes 48px, and the footer links use two columns. The introduction keeps 64px padding. Secondary tool links become a compact native chooser. Guide copy, code, and section spacing tighten without changing the font roles.
- **360px and below:** the brand name uses 16px type, 10px gap, and 12px side padding to fit on one line.
- **Activity dashboard:** at 1150px metric values tighten. At 1000px the rail becomes 70px and content padding becomes 20px. At 900px the four metrics become two columns, chart and outcomes span the width, source controls wrap, and secondary panels stack. At 680px the rail becomes a horizontal scrollable row, workspace margins become 10px, content padding becomes 18px 12px, and gaps become 10px. The two-column metric layout remains; source controls and ledger actions wrap within the viewport.
- **Other workspace tools:** Doctor changes from three columns to two at 1200px, then one at 800px; the fixture select replaces its list and findings precede the editor on narrow screens. Proofs and Wallets stack their main columns at 1050px; wallet steps and proof transaction fields become one column at 680px. Evidence wraps its toolbar and stacks the overview at 1000px. B20 comparisons stack at 900px. Shared tool controls stack at 900px, and inputs use 16px on small screens.

Keep code and evidence overflow within their own scrollable regions. The activity ledger has a 730px minimum table width inside a labeled, keyboard-focusable horizontal scroll region. The retained attribution evidence ledger uses its existing 820px minimum.

## Elevation & Depth

The shared website is flat. It builds depth through petrol and teal tonal layers, thin borders, generous gaps, the planetary raster, lit rock meshes, and layered pixel architecture. Shared cards, navigation, actions, and command strips do not cast shadows. Scene lighting belongs to the artwork rather than a new panel elevation.

Tool workspace windows remain flat, separated by pale grey, sage, and graphite fills with 1–2px graphite borders. The selected Evidence network segment uses yellow and has no shadow.

**The Flat Surface Rule.** Use the existing surface colors and rules to separate panels. Keep the tool workspace windows and selected controls shadow-free.

## Shapes

Shared panels, inputs, action fills, tags, and segmented navigation have square corners through the zero-radius tokens. The stepped hero perimeter, the two stepped hero panels, and the crisp-edge monogram are the signature geometry. The desktop caption outline has a 28px left inset above its lower extension in an 827×172 viewBox; the quickstart has a top-right step at x401/y22 in a 428×206 viewBox. Both are authored SVG paths with a flat canvas fill and a non-scaling 1px stroke. At the shared mobile breakpoint these outlines give way to rectangular stacked panels. Static pixel artwork, chapter architecture, and the footer canvas keep crisp edges through nearest-neighbor rendering; meteor meshes use carved three-dimensional geometry. Interface rules stay thin and sharp.

Stroke icons use inline SVG paths with approximately 1.4–2px strokes. They serve modules, files, copying, and directional links. The mark uses a 48×60 viewBox with an orthogonal five-level column and three detached rectangles.

The shared tool workspace uses square panels, fields, status markers, and progress tracks. Graphite borders and dark title strips repeat across its tools. Activity's success meter uses twenty square segments, filled in five-percentage-point increments from the recorded ratio. There are no decorative panel masks.

## Components

### Buttons and text actions

The filled action uses seafoam and petrol ink, square corners, a 52px minimum height, and a 28px gap to its arrow. Its hover fill is hover mint. Workspace secondary actions use bordered pale surfaces and dark ink; selected controls and primary actions use warm yellow. Standalone attribution-evidence and B20 actions have at least 44px height. Activity actions use 8px 14px padding and a 44px minimum height. Load activity uses workspace yellow with dark ink and the brighter workspace-accent-hover fill on hover. Text actions combine seafoam copy with an underline offset by 6px; the quiet rule color of the underline brightens on hover.

Global keyboard focus uses a 2px seafoam outline with 4px offset. State transitions use the shared 150ms easing; attribution-evidence color transitions use 150ms. Activity chart bars use a 160ms ease-out background transition. Reduced-motion preferences remove transitions and smooth scrolling. The tool workspace uses 3px current-color keyboard outlines with a 3px offset. Code and search fields use a 2px dark focus-within outline with a 2px offset.

### Candidate tags and status feedback

The candidate tag is a small outlined, square mono label with 0.1em 0.65em padding. Its wording carries release status. Status panels use the paired semantic fills and text colors, together with a written result. The before/after example uses a polite live region.

### Cards and code panels

Tool cards use the tool-card tokens, a thin teal border, and a 20px internal gap. Their padding becomes 18px below the tool breakpoint. Code examples use the dark surface, mono text, contained horizontal overflow, and a separate toolbar or caption. Homepage modules and evidence often use open rows separated by rules instead of enclosed cards.

### Inputs and selection

Shared text fields use the input tokens with a thin rule-colored border. Focus changes their fill to dark surface and their border to muted cyan; keyboard focus also retains the global outline. The caret uses seafoam.

Retained segmented controls use inset teal around square buttons. A selected Doctor segment uses dark surface and mint text; selected source-comparison buttons use seafoam with petrol ink. Preserve the implemented aria-pressed state and explanatory result.

Doctor uses “—” and “not measured” when the expected Builder Code is missing or no supported paths are found. The result explains the cause and offers Restore example. Local reports with findings say “review findings” rather than implying protection. A short debounced polite status announces result changes; invalid fields expose aria-invalid and their hint.

### Navigation

Outside the tool workspace, the desktop header is a single outlined strip with a mark-and-name area, five content links, and a filled start cell. Each navigation cell has a thin left separator. Hover applies a dark surface and seafoam lettering. The homepage positions this strip inside the composition; reading and tool pages use it in normal flow.

The desktop Tools disclosure leads directly to Doctor, Dashboard, Observatory, B20, and Smart Wallet Kit. At the shared mobile breakpoint, a native details/summary menu replaces the desktop cells and includes the same tools. Its right-aligned panel uses a petrol background and seafoam border, with contained scrolling on short screens. Escape closes disclosures and restores summary focus; choosing a link closes them. Documentation links carry aria-current, and tool navigation marks the current destination.

The shared tool workspace has its own compact graphite brand bar and labelled tools rail. The current rail item has a dark fill and yellow icon with a light label. Its mobile rail stays horizontal. A scoped status bar and shared legal/resource links finish the workspace; the marketing footer scene is hidden only beside this shell.

### Command copying

Command strips keep selectable mono code beside a copy button. Compact single-line commands scroll inside the code area. Multiline examples and long proof commands wrap inside their own area while copying the exact original string. Shared copy buttons have 44×44px minimum targets; the final homepage start strips use 52px height.

Successful copying switches the icon to a check and announces "Copied" in a status region. Clipboard failure gives a manual-copy instruction. Feedback clears after 3000ms; neither outcome changes the command.

### Source comparison

The attribution example has a labeled toolbar, two aria-pressed controls, a mono request, and a distinct result band. Before uses caution amber; After uses protected green. The example is explicitly illustrative. Do not turn that feedback into a claim that source analysis, hosted CI, runtime behavior, or deployment readiness was verified.

### Hero meteor scene

The planet remains a static Next Image. Seven carved Three.js rock meshes occupy the right scene, lower-left fragment bay, and the gap beside “SHIPPED.” The isolated flat rock in that gap has been removed from the replacement `hero-planet.png` plate so only its interactive mesh remains. Broken overhangs and deep dark cavities give the rocks volume. Seamless object-space procedural shading forms continuous cyan mineral crust, warped fractures, fine grain, and pits, with derivative-based relief under MeshStandard lighting. Slow rotation reveals the carved form. Triangle winding follows the volume's inside-to-outside direction so closed rock surfaces keep consistent FrontSide faces. Raycasting selects the actual mesh for pointer aiming. Press and drag a rock to set its direction, then release to launch it; a short press launches in the selected direction.

Actual page scrolling imparts a small, capped impulse to every idle mesh. Each rock coasts with exponential damping and a little rotation; dragging, hidden tabs, offscreen scenes, and reduced motion discard passive scroll energy. On desktop, visible mesh edges can cross the decorative frame by up to 18px. The meteor layer sits above the frame and panel edges, with bounded flight regions protecting text, controls, and the viewport. Precise silhouette bounds are measured only near an artwork edge and reused within the animation frame.

Each rock has a labeled native button. Focus a rock, use arrow keys to choose a direction, and press Enter or Space to launch. Direct pointer and keyboard manipulation remain available without a visible instruction, Launch, or Reset panel. Visible focus and polite status support the interaction. If WebGL cannot load or loses its context, cropped sprites from the existing drift-rocks artwork retain the interaction on labeled rock buttons. At 1200px and below the scene has its own space in the flowing hero layout. The responsive text frame follows the title and summary's natural height, starts 20px below the header, and uses 20px interior spacing, fixed 16px stepped corners, and two crosses anchored at opposite corners.

Small irregular rock sprites reuse crops of the existing drift-rocks artwork. Decorative scatter is halved to 48 page fragments, 11 hero fragments, and 8 shared-footer fragments. Their positions, rotations, sizes, and flips avoid a repeating pattern. Hero scatter stays in the artwork bays and responsive scene space; decorative sprites ignore input and are hidden from assistive technology. The backdrop has no star dots or orbital linework. Functional borders remain readable. Dragging meteors does not display direction arrows.

### Chapter constructions

Front-facing pixel architecture fills the left chapter spaces: a workshop beneath the product introduction heading and one slender tower filling the evidence column's remaining free height. The workshop retains its 184×112 backing canvas within 552px. The tower keeps an 80-pixel backing width displayed at 240px; ResizeObserver adds actual pixel rows at three display pixels per source pixel instead of stretching its facade. Its desktop area fills the remaining column with a 600px minimum height; at 1200px and below it uses 492px.

Pointer movement lights nearby windows. Activating the workshop cycles through four, five, and six floors before rebuilding; the tower sends a beacon signal through four states. Short light scans follow activation. Native buttons support click, tap, Enter, and Space, with accessible labels, visible focus, and status announcements. Architecture has no visible captions or interaction coaching.

### Footer excavator workshop

The shared footer contains a playable excavator delivery site in place of the BAO word. Drive the vehicle, lower its open bucket onto a loose cube, close to scoop one cube, then raise and carry it to the yellow building outline. The cube stays at the bucket while carried. Opening the loaded bucket drops it under gravity; the delivered count increases only when it lands on the marked target. A missed or low release leaves a loose cube that can be scooped again. Loose cubes collide and support each other in stacks; picking a supporting lower cube lets the cubes above settle under gravity. Swept contacts constrain the carried cube against loose cubes, the ground, and built blocks. Successful deliveries assemble a four-column, four-row building (16 blocks).

Focus the scene, then use Left/Right or A/D to drive, Up/Down or W/S to raise and lower the bucket independently, F to turn, and Space/E to scoop, open, or drop. A new drive press steps one block width (32 world pixels); held controls continue movement. Pointer and touch controls offer both drive directions, both bucket directions, a state-dependent Scoop/Open/Drop action, Turn, and Restart. Turning mirrors the cab, boom, bucket, and carried-cube position. A loaded turn requires a clear path within the world bounds; a blocked turn preserves the previous facing and explains the obstruction. Bucket state, delivery count, and written status explain pickup, release, misses, blocked turns, and completion. Completion shows 16 / 16 blocks and a workshop-complete message; Restart restores the excavator, supply, and foundation.

The workshop keeps a 12:5 canvas within a 660px maximum width. Its yellow and ochre vehicle and marker belong to the game artwork; its actions retain the existing seafoam and mint roles. Game control type is local: footer controls use 13px, and footer instructions and status use 12px. The game heading uses Space Grotesk at 17px, becoming 16px below 600px. These sizes do not replace the shared reading hierarchy.

The footer's Updates on X link opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

Meteors and the footer cap device-pixel ratio at 1.5; chapter architecture uses low-resolution backing canvases, with observed pixel-row growth for the tower. Animation pauses offscreen and while the tab is hidden. Reduced motion suppresses passive meteor drift and rotation and holds chapter light scans static. Bucket curl and the completion flag apply immediately while deliberate aiming, launching, state changes, driving, turning, lifting, scooping, and cube physics remain available. Architecture redraws on input and short activation scans; the footer runs animation frames during movement, falling or settling cubes, or short bucket/completion effects. Canvas layers and decorative sprites are hidden from assistive technology; accessible labels, visible focus, and status carry the interaction, with visible instructions confined to the footer game. Observers, listeners, animation frames, and WebGL geometry, materials, and renderer resources are released on teardown.

### Evidence navigation

B20 reports start with section links and a transaction index. Native transaction disclosures retain the relation, hash, execution, and attribution summary when closed; the first transaction starts open. Capture metadata and raw evidence stay in nested disclosures. Proof pages offer the actual replay inputs and published manifest, with an exact offline rebuild command and an explicit chain-recheck limitation. Historical manifest titles remain intact and are labeled as historical.

### Activity measurements and inspection

The four metric windows show operations, active wallets, successful operations, and recorded gas costs. Each value retains its label and data scope. The success meter has twenty segments; the filled count rounds the clamped recorded ratio to five-percentage-point steps. Unavailable ratios leave all segments unfilled and show an unavailable value.

Period and chart-metric controls expose aria-pressed and use yellow with dark ink when selected. The wide graphite chart uses square grey bars, with yellow for the last, hovered, or selected day. Daily bars filter the operations ledger, with arrow-key inspection and a native UTC day selector (36px desktop, 44px mobile). The ledger keeps search, result filtering, transaction links, share, export, pagination, and source details beside the data. Empty states explain missing measurements without invented activity.

## Do's and Don'ts

### Do:

- **Do** use petrol, teal, seafoam, and mint outside the tool workspace; use its scoped ash, graphite, and yellow roles within it.
- **Do** keep shared controls square, use thin rules, and separate major sections with the observed spacing.
- **Do** keep BAO Block Bold in the hero, Pixelify in chapter and footer display roles, Space Grotesk in explanations, and JetBrains Mono in commands and evidence.
- **Do** keep the planet static and preserve deliberate hero aiming, chapter architecture controls, and footer excavation controls with their performance guards. Keep visible homepage interaction instructions inside the footer game.
- **Do** keep status words, candidate labels, example labels, source links, and scope explanations beside their evidence.
- **Do** preserve visible keyboard focus, native disclosures, selectable commands, and contained horizontal scrolling.

### Don't:

- **Don't** add decorative background grids, dot grids, wireframe grids, or guide-line textures.
- **Don't** reintroduce the superseded light marketing canvas, Base-blue actions, or serif display family. The tool workspace's approved ash canvas is a scoped exception.
- **Don't** replace readable paragraphs, hashes, editable code, or data tables with pixel display type.
- **Don't** apply the homepage's absolute composition or display density to every guide or tool.
- **Don't** animate homepage copy and controls with the scenes, run scenes offscreen or while the tab is hidden, or remove deliberate keyboard and pointer controls under reduced motion.
- **Don't** add gradients, decorative orbital lines, star dots, or unrelated picture layers to this homepage backdrop.
- **Don't** add visible tutorial panels, interaction hints, or architecture captions outside the homepage footer game.
- **Don't** infer adoption, production readiness, contract safety, or complete project coverage from examples or published samples.

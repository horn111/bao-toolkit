---
name: Base App OS
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
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0"
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
---

# Design System: Base App OS

## Overview

**Creative North Star: "Pixel construction set"**

Base App OS uses a dark petrol canvas, teal surfaces, seafoam actions, and mint lettering. The approved world combines authored planetary pixels, a stepped outline, and square interface parts. Crisp graphics and large pixel headings establish the identity; explanations, controls, and evidence remain readable.

The same palette and local fonts connect the homepage, guides, and retained tools. The homepage has generous chapter spacing and expressive display type. Guides use a quieter reading hierarchy, and tools use compact forms, code, and data. Their different densities are intentional; a guide or evidence table does not inherit the homepage's absolute composition.

**Key Characteristics:**

- Authored BAO Block hero lettering, Pixelify chapter headings, Space Grotesk explanations, and JetBrains Mono commands.
- Flat petrol and teal surfaces, thin rules, and square shared controls.
- Irregular planetary pixels and the BAO pixel mark on a clean, grid-free canvas.
- Local pointer displacement and spring return in both hero artwork and footer lettering.
- Text labels and provenance beside status colors, examples, and evidence.

Extracted from [global tokens](app/globals.css), [homepage styles](app/home.css), [shared site styles](app/_components/site.css), [guide styles](app/docs/docs.css), [font declarations](app/layout.tsx), and [pixel behavior](app/_components/pixel-field.tsx). The retained dashboard, B20, and proof styles supply the tool-specific exceptions described below.

## Colors

The palette moves from deep petrol through teal to seafoam and mint, with muted cyan copy and warm semantic feedback. Frontmatter records the implemented values; sidecar tonal ramps are synthesized palette previews, not additional shipped tokens.

### Primary

- **Seafoam accent** (accent): filled actions, links, selection, focus outlines, active comparison buttons, and footer pixels.
- **Hover mint** (hover-mint): the brighter hover state of primary actions and start links.
- **Petrol action ink** (accent-ink): dark lettering on seafoam fills.

### Secondary

- **Frame mint** (frame-line): the recurring homepage perimeter, caption and quickstart outlines, module-rail separators, and stroke icons.
- **Pixel teal** (pixel-teal): darker particles within the footer word. The planetary raster carries its own authored tonal variation.

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
- **Tool headline:** Doctor and other retained tool heroes use the tool-headline token and become 40px below their tool breakpoint. Dashboard and B20 use the same body family and 400 weight with their own 1.12 line height and tighter tracking.
- **Title:** evidence-ledger headings use the title token. Documentation index headings use 25px/1.4 at weight 500; compact tool headings use 16–18px and weight 600.
- **Body:** the base body token is for controls and compact interface copy. Homepage and footer explanations use body-copy; homepage paragraphs cap at 70ch. Guides use 17px/1.8, cap at 72ch, and become 16px/1.75 on small screens. Introductory guide copy uses 20px/1.6 and becomes 18px.
- **Code:** examples use the code token; guide command blocks use 13px/1.9. Compact fields use the input token. Small-screen code becomes 12px where explicitly styled. Numeric dashboard totals use JetBrains Mono and tabular figures.
- **Actions and navigation:** use the action, text-action, and navigation roles. Desktop homepage navigation uses mono type with 13px and 14px minimums; the quickstart title has a 16px minimum and its command a 12px minimum. Caption copy has a 14px minimum. The shared mobile menu uses fixed readable sizes.

**The Readable Evidence Rule.** Keep paragraph text, editable code, commands, hashes, and table data in the reading or code families. Pixel type belongs to the shipped display and short outcome treatments.

## Layout

The desktop homepage hero is a composition container with aspect ratio 1672 / 941. Its stepped perimeter, offset title, right-hand planet, lower-left fragments, caption panel, quickstart, and four-part module rail use percentages and container units. These positions belong to this homepage surface, not to every future page.

Homepage chapters and the footer center within 92% width and a 1500px maximum. Major chapters use two unequal columns with 7–8% gaps and 80px vertical padding; the introduction, B20 chapter, and final start panel have their own spacing. The module rail supplies the module index without a repeated overview chapter. An Integrate → Audit and enforce → Verify and retain list introduces the workflow, and an annotated published transaction sits beside the evidence ledger. Thin horizontal rules separate the page.

The retained tool container has a 1440px maximum and 24px side padding; documentation reduces the maximum to 1400px. Guide articles use an 850px first column with a secondary column of at least 200px, separated by an 8% gap. Their table of contents sticks 32px from the top. The document has no forced minimum width; the narrow layout fits the space remaining inside a 320px viewport with a scrollbar.

Spacing tokens collect recurring measured steps from 8px control gaps through 112px chapter padding. They describe existing usage rather than a newly imposed mathematical scale.

### Responsive behavior

- **1200px and below:** the shared header switches to a native disclosure menu. The hero drops its fixed ratio, puts copy and actions into flow, and uses a two-column module rail. A readable product definition follows the headline; quickstart comes before the detailed caption. Homepage chapters and the footer become single columns; major chapter padding remains 80px.
- **900px and below:** guides become one column. The desktop contents navigation gives way to an in-guide disclosure; the related-guide area becomes static. Proof layouts also collapse at this breakpoint.
- **600px and below:** homepage and footer side gutters become 20px, the hero caption stacks, the module rail becomes one column, major chapter padding becomes 48px, and the footer links use two columns. The introduction keeps 64px padding. Secondary tool links become a compact native chooser. Guide copy, code, and section spacing tighten without changing the font roles.
- **360px and below:** the brand name uses 16px type, 10px gap, and 12px side padding to fit on one line.
- **Retained tools:** Doctor moves from three columns to two at 1024px, then one at 768px; its shared container uses 16px side padding below 768px. On narrow screens its fixture list becomes a select, text inputs use 16px, and findings precede the editor. Dashboard toolbar wrapping starts at 1050px, with overview and detail columns stacking at 720px. B20 comparisons stack at 720px. Proof layouts tighten again at 640px.

Keep code and evidence overflow within their own scrollable regions. The dashboard ledger retains an 820px minimum table width and a labeled, keyboard-focusable horizontal scroll region.

## Elevation & Depth

The shared website is flat. It builds depth through petrol and teal tonal layers, thin borders, generous gaps, and the light and shade of the planetary artwork. Shared cards, navigation, actions, and command strips do not cast shadows.

The retained dashboard's pressed network segment has a small soft shadow (0 1px 4px #00000020). This local state is the only extracted shadow token; it is not a default card elevation.

**The Flat Surface Rule.** Use the existing surface colors and rules to separate panels. Reserve the retained segment shadow for that selected control.

## Shapes

Shared panels, inputs, action fills, tags, and segmented navigation have square corners through the zero-radius tokens. The stepped hero perimeter, the two stepped hero panels, and the crisp-edge monogram are the signature geometry. The desktop caption outline has a 28px left inset above its lower extension in an 827×172 viewBox; the quickstart has a top-right step at x401/y22 in a 428×206 viewBox. Both are authored SVG paths with a flat canvas fill and a non-scaling 1px stroke. At the shared mobile breakpoint these outlines give way to rectangular stacked panels. Artwork uses nearest-neighbor rendering; interface rules stay thin and sharp.

Stroke icons use inline SVG paths with approximately 1.4–2px strokes. They serve modules, files, copying, and directional links. The mark uses a 48×60 viewBox with an orthogonal five-level column and three detached rectangles.

Retained tools still contain local rounded status pills, dots, small progress tracks, a 3px selector, and a 5px search container. These are recorded as existing exceptions, not promoted into the shared radius vocabulary.

## Components

### Buttons and text actions

The filled action uses seafoam and petrol ink, square corners, a 52px minimum height, and a 28px gap to its arrow. Its hover fill is hover mint. Compact secondary dashboard actions use a bordered dark surface, 44px minimum height, and 9px 14px padding; hover changes to inset teal. Standalone dashboard and B20 actions have at least 44px height. Text actions combine seafoam copy with an underline offset by 6px; the quiet rule color of the underline brightens on hover.

Global keyboard focus uses a 2px seafoam outline with 4px offset. State transitions use the shared 150ms easing; dashboard color transitions use 150ms. Reduced-motion preferences remove transitions and smooth scrolling.

### Candidate tags and status feedback

The candidate tag is a small outlined, square mono label with 0.1em 0.65em padding. Its wording carries release status. Status panels use the paired semantic fills and text colors, together with a written result. The before/after example uses a polite live region.

### Cards and code panels

Tool cards use the tool-card tokens, a thin teal border, and a 20px internal gap. Their padding becomes 18px below the tool breakpoint. Code examples use the dark surface, mono text, contained horizontal overflow, and a separate toolbar or caption. Homepage modules and evidence often use open rows separated by rules instead of enclosed cards.

### Inputs and selection

Shared text fields use the input tokens with a thin rule-colored border. Focus changes their fill to dark surface and their border to muted cyan; keyboard focus also retains the global outline. The caret uses seafoam.

Retained segmented controls use inset teal around square buttons. A selected Doctor segment uses dark surface and mint text; selected source-comparison buttons use seafoam with petrol ink. Preserve the implemented aria-pressed state and explanatory result.

Doctor uses “—” and “not measured” when the expected Builder Code is missing or no supported paths are found. The result explains the cause and offers Restore example. Local reports with findings say “review findings” rather than implying protection. A short debounced polite status announces result changes; invalid fields expose aria-invalid and their hint.

### Navigation

The desktop header is a single outlined strip with a mark-and-name area, five content links, and a filled start cell. Each navigation cell has a thin left separator. Hover applies a dark surface and seafoam lettering. The homepage positions this strip inside the composition; reading and tool pages use it in normal flow.

The desktop Tools disclosure leads directly to Doctor, Dashboard, Observatory, B20, and Smart Wallet Kit. At the shared mobile breakpoint, a native details/summary menu replaces the desktop cells and includes the same tools. Its right-aligned panel uses a petrol background and seafoam border, with contained scrolling on short screens. Escape closes disclosures and restores summary focus; choosing a link closes them. Documentation links carry aria-current, and tool navigation marks the current destination.

### Command copying

Command strips keep selectable mono code beside a copy button. Compact single-line commands scroll inside the code area. Multiline examples and long proof commands wrap inside their own area while copying the exact original string. Shared copy buttons have 44×44px minimum targets; the final homepage start strips use 52px height.

Successful copying switches the icon to a check and announces "Copied" in a status region. Clipboard failure gives a manual-copy instruction. Feedback clears after 3000ms; neither outcome changes the command.

### Source comparison

The attribution example has a labeled toolbar, two aria-pressed controls, a mono request, and a distinct result band. Before uses caution amber; After uses protected green. The example is explicitly illustrative. Do not turn that feedback into a claim that source analysis, hosted CI, runtime behavior, or deployment readiness was verified.

### Pixel fields

The planet and asteroid fragments each use the shared PixelField, and the footer uses it to sample the BAO word. Nearby pixels move away from the local pointer and spring back; the headline, copy, and controls stay still. The input listens on each field's parent, so the artwork can respond while remaining outside the pointer hit layer.

The implemented spring uses attraction 0.065 and velocity damping 0.82. The influence radius is bounded between 55px and 130px. Raster fields cap at 850 particles, word sampling uses a step based on 2400 target samples, and device-pixel ratio is capped at 1.5. Drawing stops when the field settles, when it is offscreen, or when the tab is hidden.

Fine-pointer capability and reduced-motion preferences gate the effect. Coarse pointers and reduced motion retain the static image or text fallback. No touch animation is added. Canvas overlays are hidden from assistive technology and do not capture pointer events.

Raster fields sample the already loaded Next Image element, including its responsive optimized source. They do not request a second original image for the canvas. Footer sampling waits for local fonts to be ready.

### Evidence navigation

B20 reports start with section links and a transaction index. Native transaction disclosures retain the relation, hash, execution, and attribution summary when closed; the first transaction starts open. Capture metadata and raw evidence stay in nested disclosures. Proof pages offer the actual replay inputs and published manifest, with an exact offline rebuild command and an explicit chain-recheck limitation. Historical manifest titles remain intact and are labeled as historical.

## Do's and Don'ts

### Do:

- **Do** use the shipped petrol, teal, seafoam, and mint roles across the homepage, guides, and retained tools.
- **Do** keep shared controls square, use thin rules, and separate major sections with the observed spacing.
- **Do** keep BAO Block Bold in the hero, Pixelify in chapter and footer display roles, Space Grotesk in explanations, and JetBrains Mono in commands and evidence.
- **Do** retain local cursor response in both hero pixels and footer lettering, with static fallbacks and the existing performance guards.
- **Do** keep status words, candidate labels, example labels, source links, and scope explanations beside their evidence.
- **Do** preserve visible keyboard focus, native disclosures, selectable commands, and contained horizontal scrolling.

### Don't:

- **Don't** add decorative background grids, dot grids, wireframe grids, or guide-line textures.
- **Don't** reintroduce the superseded light canvas, Base-blue actions, or serif display family.
- **Don't** replace readable paragraphs, hashes, editable code, or data tables with pixel display type.
- **Don't** apply the homepage's absolute composition or display density to every guide or tool.
- **Don't** animate text and controls with the particle field, run it continuously after settling, or remove reduced-motion and coarse-pointer fallbacks.
- **Don't** infer adoption, production readiness, contract safety, or complete project coverage from examples or published samples.



## Root Cause Found

**`font-variation-settings: "wght" 400`** on line 324 of `src/index.css` forces ALL text in the entire app to weight 400 (normal). This CSS property has higher specificity than `font-weight` and `font-extrabold` — it overrides everything, including inline `style={{ fontWeight: 800 }}`. This is why bold headers have been impossible to achieve.

Additionally, the Google Fonts import in `index.html` only loads Inter weights `300–700`, so weight 800 isn't even available.

## Fix (2 files)

### 1. `src/index.css` — Remove the forced weight override

Delete line 324:
```css
font-variation-settings: "wght" 400;
```

This single line is the reason **every bold style in the chat has been ignored**. Removing it lets `font-weight` work normally across the entire app.

### 2. `index.html` — Load Inter with weight 800

Change the Google Fonts URL to include weight 800:
```
Inter:wght@300;400;500;600;700;800
```

### 3. `src/components/widgets/ORSHChatDialog.tsx` — Stronger divider

Change `border-border/40` to `border-border/60` on the `h2` component for a more visible section divider.

## Why This Was So Difficult

`font-variation-settings` is a low-level CSS property that directly controls variable font rendering. It bypasses `font-weight` entirely — Tailwind classes, inline styles, and `!important` all lose to it. This is a known CSS gotcha with variable fonts.


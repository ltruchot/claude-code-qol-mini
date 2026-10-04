# Modern Reset

Based on Josh W. Comeau's CSS Reset (2025):

```css
/* Box sizing */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Remove default margin */
* {
  margin: 0;
}

/* Fluid typography and smooth scroll */
html {
  interpolate-size: allow-keywords; /* Animate to auto */
  scroll-behavior: smooth;
}

/* Sensible body defaults */
body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Media defaults */
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

/* Form elements inherit font */
input,
button,
textarea,
select {
  font: inherit;
}

/* Text wrapping */
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
  text-wrap: pretty; /* Avoid orphans */
}

h1,
h2,
h3,
h4,
h5,
h6 {
  text-wrap: balance; /* Balance heading lines */
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

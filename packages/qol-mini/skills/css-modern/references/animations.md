# CSS Animations & Transitions

Reference file for animation patterns. See SKILL.md for core CSS patterns.

---

## Animate to Auto Height

```css
/* Enable keyword animations */
html {
  interpolate-size: allow-keywords;
}

.accordion-content {
  height: 0;
  overflow: hidden;
  transition: height var(--duration-normal) var(--easing-default);
}

.accordion[open] .accordion-content {
  height: auto;
}
```

---

## `@starting-style` for Entry Animations

```css
/* Dialog/popover entry animation */
dialog {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity var(--duration-normal),
    transform var(--duration-normal),
    display var(--duration-normal) allow-discrete;
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: translateY(-20px);
  }
}

/* Exit animation */
dialog:not([open]) {
  opacity: 0;
  transform: translateY(-20px);
}
```

---

## View Transitions (Newly Available 2024)

```css
/* Enable view transitions */
@view-transition {
  navigation: auto;
}

/* Custom transition names */
.card {
  view-transition-name: card;
}

/* Customize animation */
::view-transition-old(card) {
  animation: fade-out 200ms ease;
}

::view-transition-new(card) {
  animation: fade-in 200ms ease;
}
```

---

## Keyframe Animations

```css
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: slide-up 300ms ease-out;
}
```

---

## Transition Properties

```css
.button {
  transition:
    background-color var(--duration-fast) var(--easing-default),
    transform var(--duration-fast) var(--easing-default);
}

.button:hover {
  background-color: var(--color-primary-dark);
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.98);
}
```

---

## Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

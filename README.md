# Plucky: a standing wave underline

A little zero-dependency Web Component for the [standing wave](https://en.wikipedia.org/wiki/Standing_wave) underline I'm using for the hover effect on the main nav of [my personal website](https://noahliebman.net).

## Installation

This isn't on NPM because who else would want something so oddly specific? If you really want it, download `Plucky.js` and add it to your project.

## Basic usage

Import the [script](Plucky.js) and wrap any content you want in the custom element.

```js
import { Plucky } from "/path/to/Plucky.js";
```

```html
<plucky-underline>Some text</plucky-underline>
```

When using it for a hover effect on a link, put this component inside the link rather than outside. This is because the component defaults to coloring the underline with `currentcolor`, which is your link color when inside the link, but the default text color when outside.

```html
<a href="example.html"><plucky-underline>Example</plucky-underline></a>
```

## Styling

Basic styling is done with CSS custom properties:

- `--plucky-line-color`: color of the underline. Default: `currentcolor`
- `--plucky-line-thickness`: the thickness of the line. Default: `max(.053em, 1px)`
- `--plucky-block-offset`: shifts the null line up or down. Useful if it needs to be tweaked for a particular font or a weird baseline. Default: `0`

For more advanced styling, it exposes two `part`s:

- `line-path`: styles the SVG path. E.g., `plucky-underline::part(line-path) { stroke-dasharray: 3; }`
- `line-svg`: styles the SVG element itself. This is really only exposed for applying CSS filters. E.g., `plucky-underline::part(line-svg) { filter: drop-shadow(0 0 4px currentcolor); }`

## Options

You can control the wave itself with several options:

- Attribute `amplitude` / property `amplitude`: maximum amplitude when pulled (em). Default: `.3`
- Attribute `num-half-waves` / property `numHalfWaves`: the number of half-waves across the length of the element. Default: `4`
- Attribute `pull-duration` / property `pullDuration`: duration of the "pull" (mouseover) effect (ms). Default: `120`
- Attribute `release-duration` / property `releaseDuration`: duration of the "release" (mouseout) effect (ms). Default: `3500`
- Attribute `decay-freq` / property `decayFreq`: how many cycles before fully damped. Default: `8`

## Known issues

This won't work if the underline wraps across multiple lines, so probably shouldn't be used for inline text.

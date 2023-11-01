export class Plucky extends HTMLElement {
    amplitude = .3; // maximum amplitude (em)
    numHalfWaves = 4; // number of half wavelengths
    pullDuration = 120; // duration of "pull" (mouseover) (ms)
    releaseDuration = 3500; // duration of "release" (mouseout) (ms)
    decayFreq = 8; // controls how many cycles before fully damped

    #path;
    #animation;
    #tickStart;
    #prefersReducedMotionWatcher = window.matchMedia('(prefers-reduced-motion: reduce)');
    #actualMaxAmp;
    #currentAmp = 0;
    #ampInterpolator;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        let needsStylesheetFallback = false;
        try {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(Plucky.#style);
            this.shadowRoot.adoptedStyleSheets = [sheet];
        }
        catch(e) {
            needsStylesheetFallback = true;
        }

        this.shadowRoot.innerHTML = `${needsStylesheetFallback ? `<style>${Plucky.#style}</style>` : ""}${Plucky.#template}`;
        this.#path = this.shadowRoot.querySelector("path");

        this.addEventListener("pointerenter", this);
        this.addEventListener("pointerleave", this);

        this.#prefersReducedMotionWatcher.addEventListener("change", () => this.#prefersReducedMotionCb());
    }

    connectedCallback() {
        this.#prefersReducedMotionCb();
        this.#path.setAttribute("d", this.#generateWavePath(0));

    }

    handleEvent(e) {
        if(e.type === "pointerenter") {
            this.pull();
        }
        else if(e.type === "pointerleave") {
            this.release();
        }
    }

    static get observedAttributes () {
        return ["amplitude", "num-half-waves", "pull-duration", "release-duration", "decay-freq", "touch-demo"];
    }

    attributeChangedCallback (name, oldValue, newValue) {
        switch (name) {
            case "amplitude":
                if(newValue !== oldValue) {
                    this.amplitude = +newValue;
                    this.#prefersReducedMotionCb();
                }
                break;
            case "num-half-waves":
                if(newValue !== oldValue) {
                    this.numHalfWaves = +newValue;
                }
                break;
            case "pull-duration":
                if(newValue !== oldValue) {
                    this.pullDuration = +newValue;
                }
                break;
            case "release-duration":
                if(newValue !== oldValue) {
                    this.releaseDuration = +newValue;
                }
                break;
            case "decay-freq":
                if(newValue !== oldValue) {
                    this.decayFreq = +newValue;
                }
        }
    }

    #prefersReducedMotionCb() {
        this.#actualMaxAmp = this.amplitude * (this.#prefersReducedMotionWatcher.matches ? .3333 : 1)
    }

    // very heavily based on (i.e., copied) from source at
    // https://commons.wikimedia.org/wiki/File:Harmonic_partials_on_strings.svg
    // it implements a bezier approximation of a sine curve
    #generateWavePath() {
        let amp = -this.#currentAmp;
        const XD = Math.PI / 12;
        const SQRT2 = Math.sqrt(2);
        const Y1 = (2 * SQRT2) / 7 - 1 / 7;
        const Y2 = (4 * SQRT2) / 7 - 2 / 7;
        const Y3 = SQRT2 / 2;
        const Y4 = (3 * SQRT2) / 7 + 2 / 7;

        const width = 1;

        const xmul = width / (this.numHalfWaves * Math.PI);
        const xd = XD * xmul;
        let x = 0;
        const y = 1;
        let path = `M ${x} ${y}`;

        for(let _ = 1; _ <= this.numHalfWaves; _++) {
            path = path + ` C ${x + xd}, ${y + amp * Y1}`
                        +  ` ${x + 2*xd}, ${y + amp * Y2}`
                        +  ` ${x + 3*xd}, ${y + amp * Y3}`
                        + ` C ${x + 4*xd}, ${y + amp * Y4}`
                        +  ` ${x + 5*xd}, ${y + amp}`
                        +  ` ${x + 6*xd}, ${y + amp}`
                        + ` C ${x + 7*xd}, ${y + amp}`
                        +  ` ${x + 8*xd}, ${y + amp * Y4}`
                        +  ` ${x + 9*xd}, ${y + amp * Y3}`
                        + ` C ${x + 10*xd}, ${y + amp * Y2}`
                        +  ` ${x + 11*xd}, ${y + amp * Y1}`
                        +  ` ${x + 12*xd}, ${y}`
            x += width / this.numHalfWaves;
            amp = amp * -1; // flip over vertically every half wave
        }
        return path;
    }

    #pullEaseFn(t) {
        const a = 2.3;
        const b = 6;
        return 1 - a**(-b*t);
    }

    #decayFn(t) {
        const b = 5;
        return (Math.E ** (-b * t)) * Math.cos(2 * Math.PI * this.decayFreq * t);
    }

    // generates a linear interpolator that maps 0 -> 1 to from -> to
    #generateLinearInterpolator(from, to) {
        return t => t * (to - from) + from;
    }

    #tickPull(ts) {
        if(this.#tickStart === undefined) {
            this.#tickStart = ts;
        }

        const elapsedTime = ts - this.#tickStart;
        const elapsedProportion = elapsedTime/this.pullDuration;
        this.#currentAmp = this.#ampInterpolator(this.#pullEaseFn(elapsedProportion));
        const pathData = this.#generateWavePath(this.#currentAmp);
        this.#path.setAttribute("d", pathData);

        if(elapsedTime < this.pullDuration && this.#currentAmp < this.#actualMaxAmp) {
            this.#animation = window.requestAnimationFrame(this.#tickPull.bind(this));
        }
        else {
            this.#currentAmp = this.#actualMaxAmp;
            this.#path.setAttribute("d", this.#generateWavePath(this.#currentAmp));
        }
    }

    #tickRelease(ts) {
        if(this.#tickStart === undefined) {
            this.#tickStart = ts;
        }

        const elapsedTime = ts - this.#tickStart;
        let pathData, elapsedProportion, releaseTime;
        if(this.#prefersReducedMotionWatcher.matches) {
            releaseTime = this.pullDuration;
            elapsedProportion = elapsedTime/releaseTime;
            this.#currentAmp = this.#pullEaseFn(1 - elapsedProportion) * this.#actualMaxAmp;
            pathData = this.#generateWavePath(this.#currentAmp);
        }
        else {
            releaseTime = this.releaseDuration;
            elapsedProportion = elapsedTime/releaseTime;
            this.#currentAmp = this.#ampInterpolator(1 - this.#decayFn(elapsedProportion));
            pathData = this.#generateWavePath(this.#currentAmp);
        }
        this.#path.setAttribute("d", pathData);

        if(elapsedTime < releaseTime) {
            this.#animation = window.requestAnimationFrame(this.#tickRelease.bind(this));
        }
        else {
            this.#currentAmp = 0;
            this.#path.setAttribute("d", this.#generateWavePath(this.#currentAmp));
        }
    }

    #tickCancel() {
        window.cancelAnimationFrame(this.#animation);
        this.#tickStart = undefined;
    }

    pull() {
        this.#tickCancel();
        this.#ampInterpolator = this.#generateLinearInterpolator(this.#currentAmp, this.#actualMaxAmp);
        this.#animation = window.requestAnimationFrame(this.#tickPull.bind(this));
    }

    release() {
        this.#tickCancel();
        this.#ampInterpolator = this.#generateLinearInterpolator(this.#currentAmp, 0);
        this.#animation = window.requestAnimationFrame(this.#tickRelease.bind(this));
    }

    static #style =
        `:host {
            display: inline-block;
            --_block-offset: var(--plucky-block-offset, 0);
            --_line-thickness: var(--plucky-line-thickness, max(.053em, 1px)); /* a bit of a magic number based on the font */
            --_line-color: var(--plucky-line-color, currentcolor);
        }

        #layout {
            display: grid;
            align-items: center;
        }

        #layout > * {
            grid-area: 1 / 1 / -1 / -1;
            display: block;
        }

        svg {
            justify-self: stretch;
            height: 1em;
            transform: translate(0px, var(--_block-offset));
            pointer-events: none;
            overflow: visible;
        }

        path {
            stroke: var(--_line-color);
            stroke-width: var(--_line-thickness);
            fill: none;
            vector-effect: non-scaling-stroke;
        }

        ::slotted(*) {
            text-decoration: none;
        }`;

    static #template =
        `<div id="layout">
            <slot></slot>
            <svg viewBox="0 0 1 1" preserveAspectRatio="none" part="line-svg"><path part="line-path" /></svg>
        </div>`;

    static {
        customElements.define("plucky-underline", Plucky);
    }
}

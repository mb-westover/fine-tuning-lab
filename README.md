# Fine-Tuning Lab

Five interactive toy-universe simulations of the classic fine-tuning arguments. Change one constant of nature, then watch whether stars, galaxies, carbon, oxygen and hydrogen still turn up. Every bench has presets ("slightly weaker", "much stronger", …), a fine-control slider, an animation of the run, and a chart where our own universe is drawn as a dashed ghost.

| Bench | The dial | What unfolds on screen |
|---|---|---|
| Gravity | Gravity's pull against the initial expansion, ±6% | Matter clumping into a cosmic web, or never clumping, or falling back into a Big Crunch |
| Dark energy | The cosmological constant Λ, from −10⁴× to 10⁵× ours | The same web, torn apart by expansion or pulled into a crunch |
| Strong force | Strength of the nuclear force, ±12% | The first 30 minutes after the Big Bang: deuterium, helium, diprotons |
| Hoyle state | Energy of carbon-12's 7.65 MeV resonance, −200 to +300 keV | A red giant's core fusing helium into carbon, then oxygen |
| Electromagnetism | The fine-structure constant α, ×½ to ×2½ | The periodic table being built from the Big Bang to today, and decaying |

## Running it

There is no build step and there are no dependencies. Open `index.html` in a browser, or serve the folder with any static server (for example `python3 -m http.server`); it also works as a GitHub Pages site. Fonts come from Google Fonts, and the page falls back to system fonts when offline.

## Checking the models

```
node tools/check-presets.js
```

This runs every physics engine headless (Node 16 or later), prints what each preset produces, and exits with an error if any preset no longer matches what the page says it shows. Current output, summarised:

| Bench | Much weaker | Slightly weaker | Ours | Slightly stronger | Much stronger |
|---|---|---|---|---|---|
| Gravity (−5, −1, +1, +5%) | No stars | A few stars, no galaxies | Galaxies at 0.66 Gyr | Big Crunch at 0.8 Gyr | Big Crunch at 74 Myr |
| Dark energy (−1000×, 100×, 3000×, 10⁵×) | Crunch at 1.4 Gyr | Fine at 100× | Galaxies at 0.66 Gyr | No galaxies at 3000× | No stars at 10⁵× |
| Strong force (−8, −3, +3, +8%) | Deuterium unbound: 98% H, no He | 90% H | 76% H, 20% He | 73% H | Diprotons: only 8% H left |
| Hoyle state (−100, −40, +40, +100 keV) | 99% C, 0.9% O | 81% C, 19% O | 25% C, 75% O | 0.02% C | Carbon gone |
| Electromagnetism (×½, −2.5%, +2.5%, ×2) | ⁸Be bound: model stops | Oxygen 1/39 of ours | All fine | Carbon 1/6,600; Th, U decay | No hydrogen; 72 elements unstable |

## How the models work

**Gravity and dark energy** (`js/physics/cosmology.js`). A matter + Λ universe starts at 170,000 years with density ripples of 0.4%. The Friedmann equation drives the expansion and the linear growth equation grows the ripples. Structure is drawn with the Zel'dovich approximation. "First stars" means the densest peaks reached a density contrast of 0.4; "galaxies" means typical regions reached 1. A universe "supports life" in this toy if it then gives 5 billion years of steady starlight.

**Strong force** (`js/physics/bbn.js`). 300 nucleons start at 1 second with the observed neutron fraction. Deuterium survives once the plasma cools below about 1/30 of its binding energy. Deuterium unbinds at −6% and diprotons bind at +3.5%; both thresholds sit inside the published range of estimates. Reaction probabilities are sped up to fit an animation.

**Hoyle state** (`js/physics/helium-burning.js`). This is a one-zone helium-burning core at fixed density (10⁴ g/cm³). It uses the Caughlan & Fowler (1988) rates for triple-alpha (resonant through the Hoyle state, with its alpha width falling with Coulomb penetrability), ¹²C(α,γ)¹⁶O (×1.7) and ¹⁶O(α,γ)²⁰Ne. The core sets its own temperature so that nuclear power meets a fixed luminosity. For our universe it ends with 25% carbon and 75% oxygen, close to full stellar models (19–21% C and 76–78% O; Schlattl et al. 2004).

**Electromagnetism** (`js/physics/electromagnetism.js`). The model tracks four things:
- **Hydrogen.** Hydrogen survives only if the neutron–proton mass gap exceeds the electron mass. The gap's electromagnetic share is taken as 0.80 MeV; published estimates run from 0.58 to 1.04 MeV.
- **Big Bang helium.** The same gap sets the helium made in the Big Bang, through neutron freeze-out and decay.
- **Carbon and oxygen from stars.** The Hoyle state moves by +3.99 MeV × δα/α, and ⁸Be by +2.75 MeV × δα/α (Epelbaum et al. 2013). Alpha-capture barriers scale with α, and the result feeds the helium-burning model above.
- **Which nuclei survive.** Each element is represented by one isotope. Its alpha-decay energy moves with the extra Coulomb energy (liquid-drop model, including the drift of the stability valley toward neutron-rich nuclei). Its half-life comes from Gamow tunnelling, pinned to measured Q values and half-lives where known. A liquid-drop fission estimate covers the heaviest elements.

Abundances are approximate solar-system values (Asplund et al. 2009).

## Caveats worth repeating

- **One dial at a time.** When several constants change together, some effects cancel. How big the "life-permitting region" looks depends on which axes are allowed to move (Adams 2019).
- **The gravity bench is really a density bench.** Collapse versus coasting is set by gravity's pull against the initial expansion (Ω). Inflation is the standard explanation for why that balance was so fine.
- **The Hoyle toy is touchier than real stars.** It is more sensitive to small shifts than full stellar models, because its last carbon is burned at the very end. Published tolerances range from about ±100 keV (Oberhummer et al. 2000; Schlattl et al. 2004) to about −300/+500 keV (Huang, Adams & Grohs 2019). For α, Epelbaum et al. (2013) give a window of about ±2.5%, and Oberhummer et al. (2000) about 4%.
- **Heavy-element cut-offs are rough.** In the electromagnetism bench they are uncertain by several percent in α. Below about −3.3%, ⁸Be becomes bound and the helium-burning model stops.
- **Diprotons.** Dyson's claim that bound diprotons would burn all hydrogen has been softened by later work (MacDonald & Mullan 2009; Bradford 2009).

## Project layout

```
index.html                   page and bench markup
css/lab.css                  styles (one dark theme)
js/physics/                  physics engines; no DOM, so they also run in Node
  core.js                    shared helpers (seeded random numbers)
  cosmology.js               gravity and dark-energy universe
  bbn.js                     Big Bang nucleosynthesis particle model
  helium-burning.js          one-zone helium-burning core
  electromagnetism.js        hydrogen, nuclear stability and abundances vs. α
js/lab.js                    UI helpers and the bench framework
js/benches/                  one file per bench: drawing and wiring
js/main.js                   start-up and animation loop
tools/check-presets.js       headless check of every preset
```

## License

The code is licensed under [CC BY-NC 4.0](LICENSE.txt): free to use, share and adapt with attribution, but not for commercial purposes.

## References

- Adams, F. C. (2019). The degree of fine-tuning in our universe — and others. *Physics Reports* 807, 1. [arXiv:1902.03928](https://arxiv.org/abs/1902.03928)
- Adams, F. C. (2008). Stars in other universes: stellar structure with different fundamental constants. *JCAP* 08, 010.
- Asplund, M., Grevesse, N., Sauval, A. J. & Scott, P. (2009). The chemical composition of the Sun. *ARA&A* 47, 481.
- Bradford, R. A. W. (2009). The effect of hypothetical diproton stability on the universe. *J. Astrophys. Astron.* 30, 119.
- Caughlan, G. R. & Fowler, W. A. (1988). Thermonuclear reaction rates V. *Atomic Data and Nuclear Data Tables* 40, 283.
- Epelbaum, E., Krebs, H., Lähde, T. A., Lee, D. & Meißner, U.-G. (2013). Dependence of the triple-alpha process on the fundamental constants of nature. *Eur. Phys. J. A* 49, 82. [arXiv:1303.4856](https://arxiv.org/abs/1303.4856)
- Gasser, J., Leutwyler, H. & Rusetsky, A. (2021). On the mass difference between proton and neutron. *Phys. Lett. B*. [arXiv:2003.13612](https://arxiv.org/abs/2003.13612)
- Huang, L., Adams, F. C. & Grohs, E. (2019). Sensitivity of carbon and oxygen yields to the triple-alpha resonance in massive stars. *Astroparticle Physics* 105, 13. [arXiv:1809.09168](https://arxiv.org/abs/1809.09168)
- MacDonald, J. & Mullan, D. J. (2009). Big Bang nucleosynthesis: the strong nuclear force meets the weak anthropic principle. *Phys. Rev. D* 80, 043507.
- Oberhummer, H., Csótó, A. & Schlattl, H. (2000). Stellar production rates of carbon and its abundance in the universe. *Science* 289, 88. [arXiv:astro-ph/0007178](https://arxiv.org/abs/astro-ph/0007178)
- Schlattl, H., Heger, A., Oberhummer, H., Rauscher, T. & Csótó, A. (2004). Sensitivity of the C and O production on the 3α rate. *Astrophys. Space Sci.* 291, 27. [arXiv:astro-ph/0307528](https://arxiv.org/abs/astro-ph/0307528)
- Thomas, A. W., Wang, X. G. & Young, R. D. (2015). Electromagnetic contribution to the proton–neutron mass splitting. [arXiv:1406.4579](https://arxiv.org/abs/1406.4579)
- Weinberg, S. (1987). Anthropic bound on the cosmological constant. *Phys. Rev. Lett.* 59, 2607.
- Zel'dovich, Ya. B. (1970). Gravitational instability: an approximate theory for large density perturbations. *A&A* 5, 84.

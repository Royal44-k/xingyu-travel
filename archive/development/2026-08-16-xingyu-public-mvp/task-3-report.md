# Task 3 report: original Xingyu destination imagery

## Scope

Added five local branded PNG assets, the `brandAssets` metadata registry, an
asset-integrity test, and an honest provenance record. Base commit before this
task was `eb044c3e734617c361c0705cd4a24370f292404e`.

## Preserved RED evidence

Before the images were generated, the new asset test and mapping existed but
failed with `ENOENT` for `public/assets/hero-dali-dawn.png`. This established
that the visible-image contract was not satisfied by metadata alone.

## Independent visual inspection

- Hero: a photoreal sunrise lake-and-mountain composition; the dark, uncluttered
  left third remains suitable for white title copy.
- Sichuan: autumn grass foreground, snow mountains, and a tiny non-identifiable
  traveler; no marks or text.
- Guilin: dusk karst river with a single distant raft silhouette and natural
  foreground framing; no marks or text.
- Guide: a lived-in, unbranded Bai-style courtyard with plants and stone table.
- Guardian: intact wet mountain road behind a continuous guardrail; rain and
  clouds are calm and non-sensational, with no people, vehicles, or damage.

No inspected image contains a logo, watermark, readable text, or recognizable
face. `ASSET-LICENSES.md` accurately records the assets as original project
imagery generated with the built-in Image Gen tool, with no third-party source
or supplied reference image.

## Final assets

| Path | Pixels | Bytes |
| --- | ---: | ---: |
| `public/assets/hero-dali-dawn.png` | 1536 x 1024 | 1,761,980 |
| `public/assets/destination-sichuan.png` | 1586 x 992 | 1,930,144 |
| `public/assets/destination-guilin.png` | 1586 x 992 | 2,053,484 |
| `public/assets/guide-dali-courtyard.png` | 1484 x 1060 | 2,543,010 |
| `public/assets/guardian-rainy-mountain.png` | 1586 x 992 | 1,983,177 |

`src/data/assets.ts` uses the exact inspected dimensions and each mapping path
matches its local file.

## GREEN verification

- `./node_modules/.bin/vitest.CMD run tests/unit/assets.test.ts`: 1 file and 1
  test passed.
- `./node_modules/.bin/vitest.CMD run`: 5 files and 36 tests passed.
- `./node_modules/.bin/tsc.CMD --noEmit --incremental false`: exited 0.
- `./node_modules/.bin/eslint.CMD .`: exited 0.

## Commit

- `4598c274ef1ab041ea1fcb7fbff17cc68859c22f` — `feat: add original xingyu destination imagery`.

## Concerns

The image generator returned native dimensions rather than the aspirational
prompt dimensions from the brief. The registry deliberately records the actual
pixel dimensions verified from the files. The usual `pnpm vitest ...` command
did not resolve `vitest` through this worktree's PATH shim; the direct local
executables above were used. The first sandboxed direct Vitest attempt also
could not write Vite's temporary config file; the final test invocations ran
outside the sandbox and passed.

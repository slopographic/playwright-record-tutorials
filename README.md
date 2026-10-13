# Slop PDF walkthrough recorder

Records the Slop PDF walkthrough in a visible Chromium on a virtual screen, captured with ffmpeg at a steady frame rate (the same approach as OBS). Runs in a Podman or Docker container.

## Build

    podman build -t slop-recorder -f Containerfile .

## Run

CPU only:

    podman run --rm -v "$PWD/out:/out" slop-recorder

With an NVIDIA GPU (needs the NVIDIA container toolkit):

    podman run --rm --device nvidia.com/gpu=all -v "$PWD/out:/out" slop-recorder

Docker: use `--gpus all` in place of the device flag.

The recording is written to `out/slop-pdf-walkthrough.mp4`. To record another site, set `URL`:

    podman run --rm -e URL=https://example.com/pdf/ -v "$PWD/out:/out" slop-recorder

## Files

- `Containerfile`: the image (Playwright base, Xvfb, ffmpeg).
- `run.sh`: starts the virtual screen and the recording, runs the walkthrough, stops the recording.
- `slop-pdf-demo.mjs`: the walkthrough, step by step. It prints each step as it runs.
- `sample.pdf`: the PDF the walkthrough opens.

## Known gaps

- Step 11 (redaction) is skipped: the word it looks for is not on the page after the edit step.
- The container has been built and run here only on a CPU; the GPU path is untested.

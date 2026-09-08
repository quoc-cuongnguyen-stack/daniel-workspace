# Run input

Copy to `.icm/projects/<slug>/input/run.md`. Fill before `01-survey`.

```yaml
slug: example
project_cwd: /absolute/path/to/target
intent: Bootstrap a project ICM for Feature Implementation
write_into_target: false
```

## Intent

One paragraph. What should the generated ICM help an agent do on this project?

## Notes

- `project_cwd` must be absolute and exist.
- `write_into_target` stays `false`. Artifacts stay under `.icm/projects/<slug>/`.
- Do not paste tickets here if they belong in a later product-stage `input/`.

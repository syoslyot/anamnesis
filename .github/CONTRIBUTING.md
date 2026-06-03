# Contributing to anamnesis

Thanks for your interest in contributing.

## Getting started

```bash
git clone https://github.com/syoslyot/anamnesis.git
cd anamnesis
npm test
```

## Workflow

This project uses Git Flow:

- `main` — stable releases only
- `develop` — integration branch
- `feature/*` — new features, branch off `develop`
- `fix/*` — bug fixes, branch off `develop`

All contributions go through a PR targeting `develop`.

## Submitting a PR

1. Fork the repo and create a branch from `develop`
2. Make your changes
3. Run `npm test` and make sure all tests pass
4. Open a PR — fill in the template

## Reporting bugs

Use the [bug report template](https://github.com/syoslyot/anamnesis/issues/new?template=bug_report.md).

## Code style

- No unnecessary comments
- No abstractions beyond what the task requires
- Prefer clarity over cleverness

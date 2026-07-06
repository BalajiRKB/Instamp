# Contributing to Instamp

Thanks for your interest in contributing! This project is maintained by **Balaji R** and is open to community contributions once the MVP (Phase 1) is stable.

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, focused commits
4. Ensure the app still runs locally (`npm run dev`) without errors
5. Open a Pull Request with a clear description of what you changed and why

## Code Style

- Use functional React components with hooks
- Keep components small and single-responsibility (see `docs/LLD.md` for structure)
- Use Tailwind utility classes rather than custom CSS where possible
- Run `npm run lint` before submitting a PR

## Reporting Issues

- Use GitHub Issues for bugs and feature requests
- Include browser version and, if possible, a sample (anonymized) export snippet that reproduces the issue

## Privacy Reminder

This project must never introduce any code that sends chat data to a server or third party. All processing must remain client-side. Any PR that violates this will not be merged.

## Questions

Open a GitHub Discussion or reach out via the contact info on the maintainer's GitHub profile.

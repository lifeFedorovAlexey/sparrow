# Agent Instructions

## Environment setup

This repository does not commit `node_modules`. In every fresh clone or isolated agent workspace, install the locked dependencies before running tests:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

A missing package before `npm ci` is an environment/setup failure, not a source-code logic error. Check `package.json` and `package-lock.json` before reporting a dependency as undeclared.

## Review protocol

1. Confirm the expected branch and commit with `git status --short --branch` and `git log -1 --oneline`.
2. Run the environment setup commands above.
3. Review `git diff origin/main...HEAD`.
4. Keep these categories separate:
   - `security_concerns`: vulnerabilities in committed code;
   - `logic_errors`: defects reproducible after successful setup;
   - `environment_errors`: clone, path, installation, network, or tool failures;
   - `suggestions`: non-blocking improvements.
5. Never mark an environment error as a logic error.
6. Include the exact setup and test commands in the review evidence.

## Architecture

- Keep files focused and below 100 lines where practical.
- Keep tests next to the module they verify.
- Domain behavior belongs in `src/modules`.
- External I/O belongs in `src/infrastructure`.
- `src/core` coordinates modules and must not contain site-specific parsing logic.
- Generated parser projects must be independently runnable after `npm install`.

# Security policy

## Reporting

Please report security vulnerabilities via GitHub's private advisory form:

→ **https://github.com/rdh073/claude-conductor/security/advisories/new**

We aim to acknowledge reports within **7 days**.

## Scope

**In scope** — vulnerabilities in:

- The conductor plugin code itself: skills, agents, hooks, monitors, `bin/` scripts.
- The plugin's interactions with the user's filesystem (e.g. the auto-commit hook, atomic-write helpers).
- Documented plugin behaviors.

**Out of scope** (report directly to the relevant party):

- Vulnerabilities in [Claude Code](https://claude.com/product/claude-code) itself → Anthropic.
- Issues with Anthropic's services or API → Anthropic.
- Bugs in third-party tools the plugin invokes (`git`, `gh`, `node`).

## Disclosure

We coordinate disclosure timelines with reporters. Default window: **90 days**
from acknowledgement, with extensions for complex fixes by mutual agreement.

Credit is offered to reporters in release notes unless anonymity is requested.

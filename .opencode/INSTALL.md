# Installing Frontend Quickstart for OpenCode

Install `frontend-quickstart` as a personal skill for OpenCode.

## Installation

1. Clone this repository somewhere on disk:

   ```bash
   git clone <replace-with-your-github-repo-url> ~/frontend-quickstart
   ```

2. Symlink it into your OpenCode skills directory:

   ```bash
   mkdir -p ~/.config/opencode/skills
   ln -s ~/frontend-quickstart ~/.config/opencode/skills/frontend-quickstart
   ```

3. Restart OpenCode.

## Verify

Ask OpenCode to list skills or to use `frontend-quickstart` on a frontend repository.

## Updating

```bash
cd ~/frontend-quickstart && git pull
```

Restart OpenCode after updating so it re-loads the skill.

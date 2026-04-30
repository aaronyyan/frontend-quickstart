# Installing Frontend Quickstart for Codex

Enable `frontend-quickstart` in Codex via native skill discovery.

## Installation

1. Clone this repository somewhere on disk:

   ```bash
   git clone <replace-with-your-github-repo-url> ~/frontend-quickstart
   ```

2. Symlink the repository into Codex's skill directory:

   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/frontend-quickstart ~/.agents/skills/frontend-quickstart
   ```

   Windows (PowerShell):

   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\frontend-quickstart" "$env:USERPROFILE\frontend-quickstart"
   ```

3. Restart Codex so it re-discovers skills.

## Verify

Start a new session and ask Codex to analyze a frontend repository with `frontend-quickstart`.

## Updating

```bash
cd ~/frontend-quickstart && git pull
```

Because Codex reads the symlinked skill directory directly, updates take effect after restart.

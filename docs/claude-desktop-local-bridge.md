# Claude Desktop local bridge

This is a temporary workaround for the Claude web OAuth callback issue. The
bridge runs locally, but it forwards requests to the deployed portal at
`https://upsc-practice.vercel.app/mcp`; it does not run the UPSC portal locally.

## One-time setup

From the repository directory:

```bash
npm run mcp:login
```

The command opens a browser. Sign in with the UPSC Practice account you want
Claude to use and approve the connection. The access and refresh tokens are
stored in `.mcp/claude-desktop-credentials.json`, which is ignored by Git.

## Claude Desktop configuration (macOS)

Open `~/Library/Application Support/Claude/claude_desktop_config.json` and add
the following under `mcpServers`. Replace the path with the absolute path to
this repository:

```json
{
  "mcpServers": {
    "upsc-practice": {
      "command": "node",
      "args": [
        "/absolute/path/to/prelims_practice/scripts/mcp-desktop-bridge.mjs"
      ],
      "cwd": "/absolute/path/to/prelims_practice"
    }
  }
}
```

Restart Claude Desktop. It will launch the bridge on demand. The bridge must be
available while Claude is using UPSC Practice; the portal itself remains on
Vercel.

## Verify

Start a new Claude conversation and ask:

> List my UPSC papers.

The response should contain only the papers belonging to the account used in
the browser authorization. To stop using the workaround, remove the entry
from Claude Desktop's configuration after Claude's remote OAuth callback is
fixed.

# MongoDB MCP Server

This server allows AI agents (such as Google Cloud Agent Platform and Claude Desktop) to directly interact with a **MongoDB** database via the Model Context Protocol (MCP).

Written in Node.js + TypeScript, it is designed with a **primary focus on cloud deployment for hackathons** via Google Cloud Run, while also supporting local testing.

- **Streamable HTTP** — Main mode for cloud deployment on Google Cloud Run (used by Google Cloud Agent Platform).
- **Stdio** — Alternative mode for local testing (Claude Desktop, CLI).

## Available Tools

| Tool | Description |
|---|---|
| `list_collections` | List all collections in the connected database |
| `get_schema` | Analyze collection structure by sampling documents (returns field types) |
| `query_documents` | Search documents with support for filters, projection, limit, and pagination |
| `insert_document` | Safely insert a new document into a collection |
| `aggregate` | Run a MongoDB aggregation pipeline |

---

## Primary Use Case: Hackathon Deployment (Google Cloud Run)

This section covers deploying the MCP server to Google Cloud Run, which provides a public HTTPS endpoint compatible with the **Google Cloud Agent Platform**.

### 1. Authentication and Project Selection

```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

### 2. Deployment

Run the following command from the `mcp-mongo` folder:

```bash
gcloud run deploy your-mcp-service-name \
  --source . \
  --region your_region \
  --allow-unauthenticated \
  --session-affinity
```

> [!IMPORTANT]
> The `--session-affinity` flag is mandatory. Transport sessions are stored in the container's memory, so all requests from the same session must be routed to the same instance.

### 3. Configuring MONGODB_URI

After deployment, set your database credentials via the GCP console or CLI:

```bash
gcloud run services update your-mcp-service-name \
  --region your_region \
  --set-env-vars MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/your_database_name?appName=your-cluster-name"
```

> [!NOTE]
> Connection string format: Make sure to specify the database name **before** the `?` (`/your_database_name?...`). Without it, the server will connect to the default database.

### 4. Connecting to Google Cloud Agent Platform

In the Agent Builder console, when creating an MCP tool, specify:

- **Endpoint URL:** `https://your-mcp-service-name-XXXXXX-ew.a.run.app/sse`

The server accepts requests on `/sse` and `/mcp` using the Streamable HTTP protocol (MCP protocol version 2025-11-25).

---

## Alternative: Local Testing (Claude Desktop)

While the primary goal is cloud deployment, you can test the server locally using Claude Desktop. [Claude Desktop](https://claude.ai/download) is the official application by Anthropic (the creators of the MCP standard). It features native support for running local MCP servers via standard input/output (`stdio`), making it the ideal tool for local testing before deploying to the cloud.

### 1. Local Build

```bash
cd mcp-mongo
npm install
npm run build
```

### 2. Connecting to Claude Desktop

Add the following configuration to `%APPDATA%\Claude\claude_desktop_config.json` (on Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (on macOS):

```json
{
  "mcpServers": {
    "your-mcp-server-name": {
      "command": "node",
      "args": ["/absolute/path/to/your-project/mcp-mongo/build/index.js"],
      "env": {
        "MONGODB_URI": "mongodb+srv://user:password@cluster.mongodb.net/your_database_name?appName=your-cluster-name"
      }
    }
  }
}
```

import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
  isInitializeRequest
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient, Db, Document } from "mongodb";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { Request, Response } from "express";

// Fetch MongoDB URI from environment or default to local development instance
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/spatial_optician";

let client: MongoClient | null = null;
let db: Db | null = null;

// Helper to establish and return the MongoDB database connection
async function getDb(): Promise<Db> {
  if (db && client) return db;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.replace("/", "") || "spatial_optician";
    db = client.db(dbName);
    console.error(`Successfully connected to database: ${dbName}`);
    return db;
  } catch (err: any) {
    console.error(`Failed to connect to MongoDB at ${MONGODB_URI}:`, err);
    throw new McpError(ErrorCode.InternalError, `Database connection failed: ${err.message}`);
  }
}

// Factory: builds a fresh MCP Server with all tools registered
function buildMcpServer(): Server {
  const server = new Server(
    { name: "spatial-optician-mcp-mongo", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ─── Tool list ──────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_collections",
        description: "List all collections inside the connected MongoDB database.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_schema",
        description: "Analyzes the database collection schema by sampling documents.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Name of the collection to analyze" },
            sampleSize: { type: "number", default: 10, description: "Number of documents to sample" }
          },
          required: ["collection"]
        }
      },
      {
        name: "query_documents",
        description: "Searches documents from a collection using MongoDB filter syntax.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Collection name" },
            filter: { type: "object", description: "MongoDB query filter" },
            projection: { type: "object", description: "Fields to include/exclude" },
            limit: { type: "number", default: 20, description: "Max documents to return (cap 100)" },
            skip: { type: "number", default: 0, description: "Documents to skip for pagination" }
          },
          required: ["collection"]
        }
      },
      {
        name: "insert_document",
        description: "Inserts a new document into a collection.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Collection name" },
            document: { type: "object", description: "Document to insert" }
          },
          required: ["collection", "document"]
        }
      },
      {
        name: "aggregate",
        description: "Runs a MongoDB aggregation pipeline on a collection.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Collection name" },
            pipeline: { type: "array", items: { type: "object" }, description: "Aggregation pipeline" }
          },
          required: ["collection", "pipeline"]
        }
      }
    ]
  }));

  // ─── Tool execution ─────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const database = await getDb();
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_collections": {
          const collections = await database.listCollections().toArray();
          return {
            content: [{ type: "text", text: JSON.stringify(collections.map(c => c.name), null, 2) }]
          };
        }

        case "get_schema": {
          const colName = args?.collection as string;
          if (!colName) throw new McpError(ErrorCode.InvalidParams, "Collection parameter is required");
          const sampleSize = (args?.sampleSize as number) || 10;
          const docs = await database.collection(colName).find({}).limit(sampleSize).toArray();
          if (docs.length === 0) return { content: [{ type: "text", text: `Collection "${colName}" is empty.` }] };

          const schema: Record<string, string[]> = {};
          docs.forEach(doc => {
            Object.keys(doc).forEach(key => {
              const val = doc[key];
              let type: string = typeof val;
              if (val === null) type = "null";
              else if (Array.isArray(val)) type = "array";
              else if (val instanceof Date) type = "date";
              else if (val instanceof Object && (val as any)._bsontype) type = (val as any)._bsontype;
              if (!schema[key]) schema[key] = [];
              if (!schema[key].includes(type)) schema[key].push(type);
            });
          });

          return { content: [{ type: "text", text: JSON.stringify({ collection: colName, sampledDocuments: docs.length, schema }, null, 2) }] };
        }

        case "query_documents": {
          const colName = args?.collection as string;
          if (!colName) throw new McpError(ErrorCode.InvalidParams, "Collection parameter is required");
          const filter = (args?.filter as Document) || {};
          const projection = (args?.projection as Document) || {};
          const limit = Math.min((args?.limit as number) || 20, 100);
          const skip = (args?.skip as number) || 0;

          const results = await database.collection(colName)
            .find(filter).project(projection).skip(skip).limit(limit).toArray();
          return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }

        case "insert_document": {
          const colName = args?.collection as string;
          const document = args?.document as Document;
          if (!colName || !document) throw new McpError(ErrorCode.InvalidParams, "Both collection and document are required");
          const result = await database.collection(colName).insertOne(document);
          return { content: [{ type: "text", text: JSON.stringify({ success: true, insertedId: result.insertedId }, null, 2) }] };
        }

        case "aggregate": {
          const colName = args?.collection as string;
          const pipeline = args?.pipeline as Document[];
          if (!colName || !pipeline) throw new McpError(ErrorCode.InvalidParams, "Both collection and pipeline are required");
          const results = await database.collection(colName).aggregate(pipeline).toArray();
          return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (err: any) {
      console.error(`Error executing tool ${name}:`, err);
      return {
        isError: true,
        content: [{ type: "text", text: `Error executing database command: ${err.message}` }]
      };
    }
  });

  return server;
}

// ─── Server startup ────────────────────────────────────────────────────────────
async function startServer() {
  const PORT = process.env.PORT;

  if (PORT) {
    // Use the official SDK Express factory — handles body parsing correctly
    const app = createMcpExpressApp({ host: '0.0.0.0' });

    // Session store: maps Mcp-Session-Id -> transport
    const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

    // ── Streamable HTTP (2025-11-25) — used by Google Cloud Agent Platform ──
    const mcpHandler = async (req: Request, res: Response) => {
      console.error(`[MCP] ${req.method} ${req.originalUrl}`);
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId] instanceof StreamableHTTPServerTransport) {
          transport = transports[sessionId] as StreamableHTTPServerTransport;
        } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              console.error(`[MCP] Session initialized: ${sid}`);
              transports[sid] = transport;
            }
          });
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) {
              console.error(`[MCP] Session closed: ${sid}`);
              delete transports[sid];
            }
          };
          await buildMcpServer().connect(transport);
        } else {
          res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session" }, id: null });
          return;
        }

        await transport.handleRequest(req, res, req.body);
      } catch (err: any) {
        console.error("[MCP] Error:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
      }
    };

    // Both /mcp and /sse route to the same modern handler
    app.all("/mcp", mcpHandler);
    app.all("/sse", mcpHandler);

    app.listen(PORT, () => {
      console.error(`MongoDB MCP Server running on port ${PORT}`);
    });
  } else {
    // Stdio for local Claude Desktop / CLI usage
    const transport = new StdioServerTransport();
    await buildMcpServer().connect(transport);
    console.error("MongoDB MCP Server listening on stdin/stdout...");
  }
}

startServer().catch(err => {
  console.error("Critical error in MCP Server startup:", err);
  process.exit(1);
});

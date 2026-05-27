import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient, Db, Document } from "mongodb";

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
    // Parse database name from the connection string or default to spatial_optician
    const dbName = new URL(MONGODB_URI).pathname.replace("/", "") || "spatial_optician";
    db = client.db(dbName);
    console.error(`Successfully connected to database: ${dbName}`);
    return db;
  } catch (err: any) {
    console.error(`Failed to connect to MongoDB at ${MONGODB_URI}:`, err);
    throw new McpError(ErrorCode.InternalError, `Database connection failed: ${err.message}`);
  }
}

// Initialize the MCP Server
const server = new Server({
  name: "spatial-optician-mcp-mongo",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

/**
 * Register all available database tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_collections",
        description: "List all collections inside the connected MongoDB database.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_schema",
        description: "Analyzes the database collection schema by sampling documents and listing their types.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Name of the collection to analyze" },
            sampleSize: { type: "number", default: 10, description: "Number of documents to inspect for schema analysis" }
          },
          required: ["collection"]
        }
      },
      {
        name: "query_documents",
        description: "Searches documents from a specific collection using standard MongoDB filter syntax.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Name of the collection to query" },
            filter: { type: "object", description: "Standard MongoDB query filter object, e.g., { 'status': 'active' }" },
            projection: { type: "object", description: "Fields to include or exclude, e.g., { 'name': 1, 'email': 1 }" },
            limit: { type: "number", default: 20, description: "Maximum number of documents to return (cap at 100)" },
            skip: { type: "number", default: 0, description: "Number of documents to skip for pagination" }
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
            collection: { type: "string", description: "Name of the collection" },
            document: { type: "object", description: "The document object to insert" }
          },
          required: ["collection", "document"]
        }
      },
      {
        name: "aggregate",
        description: "Runs a custom aggregation pipeline query on a collection.",
        inputSchema: {
          type: "object",
          properties: {
            collection: { type: "string", description: "Name of the collection" },
            pipeline: { type: "array", items: { type: "object" }, description: "MongoDB aggregation pipeline array" }
          },
          required: ["collection", "pipeline"]
        }
      }
    ]
  };
});

/**
 * Handle tool execution calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const database = await getDb();
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_collections": {
        const collections = await database.listCollections().toArray();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(collections.map(col => col.name), null, 2)
            }
          ]
        };
      }

      case "get_schema": {
        const colName = args?.collection as string;
        const sampleSize = (args?.sampleSize as number) || 10;
        
        if (!colName) {
          throw new McpError(ErrorCode.InvalidParams, "Collection parameter is required");
        }

        const collection = database.collection(colName);
        const docs = await collection.find({}).limit(sampleSize).toArray();

        if (docs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Collection "${colName}" is empty. Schema could not be analyzed.`
              }
            ]
          };
        }

        // Aggregate key types across sampled documents
        const schema: Record<string, string[]> = {};
        docs.forEach(doc => {
          Object.keys(doc).forEach(key => {
            const val = doc[key];
            let type: string = typeof val;
            if (val === null) type = "null";
            else if (Array.isArray(val)) type = "array";
            else if (val instanceof Date) type = "date";
            else if (val instanceof Object && val._bsontype) type = val._bsontype; // BSON types

            if (!schema[key]) {
              schema[key] = [];
            }
            if (!schema[key].includes(type)) {
              schema[key].push(type);
            }
          });
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                collection: colName,
                sampledDocuments: docs.length,
                schema: schema
              }, null, 2)
            }
          ]
        };
      }

      case "query_documents": {
        const colName = args?.collection as string;
        const filter = (args?.filter as Document) || {};
        const projection = (args?.projection as Document) || {};
        const limit = Math.min((args?.limit as number) || 20, 100);
        const skip = (args?.skip as number) || 0;

        if (!colName) {
          throw new McpError(ErrorCode.InvalidParams, "Collection parameter is required");
        }

        const collection = database.collection(colName);
        const results = await collection
          .find(filter)
          .project(projection)
          .skip(skip)
          .limit(limit)
          .toArray();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case "insert_document": {
        const colName = args?.collection as string;
        const document = args?.document as Document;

        if (!colName || !document) {
          throw new McpError(ErrorCode.InvalidParams, "Both collection and document parameters are required");
        }

        const collection = database.collection(colName);
        const result = await collection.insertOne(document);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                insertedId: result.insertedId
              }, null, 2)
            }
          ]
        };
      }

      case "aggregate": {
        const colName = args?.collection as string;
        const pipeline = args?.pipeline as Document[];

        if (!colName || !pipeline) {
          throw new McpError(ErrorCode.InvalidParams, "Both collection and pipeline parameters are required");
        }

        const collection = database.collection(colName);
        const results = await collection.aggregate(pipeline).toArray();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing database command: ${err.message}`
        }
      ]
    };
  }
});

// Start the MCP server using standard input/output transport
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MongoDB Model Context Protocol (MCP) Server is listening on stdin/stdout...");
}

startServer().catch(err => {
  console.error("Critical error in MCP Server startup:", err);
  process.exit(1);
});

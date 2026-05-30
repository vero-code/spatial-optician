# Spatial Optician

[![MongoDB for Startups](https://img.shields.io/badge/MongoDB_for_Startups-Supported-emerald?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/startups)
[![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React 19](https://img.shields.io/badge/React%2019-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-%23009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%23007acc.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)](https://www.python.org/)
[![Gemini](https://img.shields.io/badge/Gemini%203.5%20Flash-121011?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

**Spatial Optician** is an intelligent analytical platform designed for performing energy-efficient facility lighting audits, calculating retrofitting Return on Investment (ROI), and conducting automated fixture selection. Supported by the **MongoDB for Startups** program, the system leverages high-performance cloud databases and a custom Model Context Protocol (MCP) gateway to deliver real-time, data-driven recommendations powered by an AI Agent (Gemini 3.5 Flash) integrated via **Google ADK (Agent Development Kit)**.

The user interface is uniquely styled as an interactive engineering blueprint workspace, catering to facility managers and optics engineers alike.

## 🏛️ Project Architecture

A comprehensive breakdown of components, databases, data structures, and multi-agent interaction flows can be found in the:
👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**

> [!TIP]
> **Key Showcase: Agentic Self-Healing Catalog Expansion**
> If a requested lighting fixture is missing from the database, our Gemini agent dynamically triggers a live web search (via the `GoogleSearchTool`), extracts the precise engineering specifications, and uses the custom MCP `insert_document` tool to **dynamically write the new fixture back into the MongoDB database**, completing the ROI calculations on the fly!

## 🚀 Quick Start Guide

### 1. Database Configuration (MongoDB)
Ensure you have a running MongoDB database or provide your connection string using the `MONGODB_URI` environment variable inside your backend configuration.

### 2. Backend (FastAPI Server)
Navigate to the `backend` folder and run the following commands:
```bash
cd backend
# Synchronize environment and install dependencies
uv sync
# Start the development server
uv run fastapi dev main.py
```
Alternatively, launch using the PowerShell utility script:
```powershell
.\run.ps1
```

### 3. Frontend (React + Vite)
Navigate to the `frontend` folder and launch the local development environment:
```bash
cd frontend
npm install
npm run dev
```

### 4. MongoDB MCP Server
If you need to run the Model Context Protocol database gateway locally:
```bash
cd mcp-mongo
npm install
npm run build
npm start
```
*Note: In production, the backend is configured to connect to the deployed SSE MCP endpoint at `https://spatial-optician-mcp-601334765015.europe-west1.run.app/sse`.*

## 🛠️ Technology Stack
* **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Motion, Lucide Icons.
* **Backend**: Python, FastAPI, PyMongo, Pydantic, Google ADK (Agent Development Kit).
* **MCP Server**: Node.js, Express, TypeScript, Model Context Protocol SDK, MongoDB Driver.

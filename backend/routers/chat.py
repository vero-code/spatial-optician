import agent as agent_module

from fastapi import APIRouter, HTTPException

from schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Forward a user message to the Dr. Aris ADK agent and return the reply."""
    if agent_module.root_agent is None:
        raise HTTPException(
            status_code=503,
            detail="ADK Agent is not initialized. Check server logs.",
        )

    try:
        response = agent_module.root_agent.run(request.message)
        reply = getattr(response, "text", str(response)).strip()
        return ChatResponse(message=reply or "No response from agent.")
    except Exception as exc:
        print(f"ADK Agent error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

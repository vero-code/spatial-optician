import uuid

import agent as agent_module
from fastapi import APIRouter, HTTPException
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types

from schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api")

# One shared session service; Runner is created lazily after agent init
_session_service = InMemorySessionService()
_runner: Runner | None = None


def _get_runner() -> Runner:
    """Return a cached Runner, creating it on first call."""
    global _runner
    if _runner is None:
        if agent_module.root_agent is None:
            raise RuntimeError("ADK Agent is not initialized.")
        _runner = Runner(
            agent=agent_module.root_agent,
            app_name="Spatial_Optician",
            session_service=_session_service,
            auto_create_session=True,
        )
    return _runner


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Forward a user message to the Dr. Aris ADK agent and return the reply."""
    if agent_module.root_agent is None:
        raise HTTPException(
            status_code=503,
            detail="ADK Agent is not initialized. Check server logs.",
        )

    try:
        runner = _get_runner()
        new_message = types.Content(
            role="user",
            parts=[types.Part.from_text(text=request.message)],
        )

        reply_parts: list[str] = []
        async for event in runner.run_async(
            user_id="default_user",
            session_id=str(uuid.uuid4()),  # fresh session per request
            new_message=new_message,
        ):
            if (
                event.is_final_response()
                and event.content
                and event.content.parts
            ):
                for part in event.content.parts:
                    if part.text:
                        reply_parts.append(part.text)

        reply = "".join(reply_parts).strip()
        return ChatResponse(message=reply or "No response from agent.")
    except Exception as exc:
        print(f"ADK Agent error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


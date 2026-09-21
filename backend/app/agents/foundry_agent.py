"""ATLAS Foundry adapter with a local mock mode."""

from app.core.config import get_settings


def ask_atlas(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    settings = get_settings()
    mode = settings.atlas_llm_mode.lower()

    if mode == "mock":
        return (
            "Routing is how a network chooses the next path for data to move toward its destination.\n\n"
            "Think of it like choosing roads on a map: the packet has a destination, and the router "
            "checks its routing table like a map to decide the next road.\n\n"
            "Quick question: what do you think a router looks at first when deciding where to send a packet next?"
        )

    if mode != "foundry":
        raise ValueError("ATLAS_LLM_MODE must be either 'mock' or 'foundry'.")

    if not settings.azure_ai_project_endpoint:
        raise ValueError("AZURE_AI_PROJECT_ENDPOINT is required when ATLAS_LLM_MODE=foundry.")

    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential

    project = AIProjectClient(
        endpoint=settings.azure_ai_project_endpoint,
        credential=DefaultAzureCredential(),
    )
    openai_client = project.get_openai_client(agent_name=settings.azure_ai_agent_name)

    conversation = openai_client.conversations.create()
    prompt = _compose_prompt(system_prompt, history, user_message)
    response = openai_client.responses.create(
        conversation=conversation.id,
        input=prompt,
    )
    return response.output_text


def _compose_prompt(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    history_lines = [
        f"{message.get('role', 'unknown')}: {message.get('content', '')}"
        for message in history
    ]
    history_text = "\n".join(history_lines) if history_lines else "No prior messages."
    return (
        f"{system_prompt}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"Student message:\n{user_message}"
    )

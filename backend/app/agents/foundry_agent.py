"""ATLAS Foundry adapter with a local mock mode."""

import json
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.core.config import get_settings


class TurnAnalysis(BaseModel):
    concept: str
    answer_quality: Literal["correct", "partial", "incorrect", "dont_know", "none"]
    hint_used: bool
    transfer: bool
    misconception: str | None
    asked_for_confirmation: bool


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

    openai_client = _foundry_openai_client()

    conversation = openai_client.conversations.create()
    prompt = _compose_prompt(system_prompt, history, user_message)
    response = openai_client.responses.create(
        conversation=conversation.id,
        input=prompt,
    )
    return _student_facing_output(response.output_text)


def analyze_turn(student_message: str, tutor_context: dict[str, object]) -> TurnAnalysis:
    settings = get_settings()
    mode = settings.atlas_llm_mode.lower()

    if mode == "mock":
        return _mock_analyze_turn(student_message, tutor_context)

    if mode != "foundry":
        raise ValueError("ATLAS_LLM_MODE must be either 'mock' or 'foundry'.")

    try:
        raw_response = _ask_foundry_for_turn_analysis(student_message, tutor_context)
        return TurnAnalysis.model_validate(json.loads(raw_response))
    except (json.JSONDecodeError, ValidationError, ValueError, AttributeError):
        return _empty_turn_analysis(tutor_context)


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


def _mock_analyze_turn(student_message: str, tutor_context: dict[str, object]) -> TurnAnalysis:
    message = student_message.casefold()
    concept = _context_concept(tutor_context)
    hint_used = "hint" in message
    asked_for_confirmation = any(
        phrase in message
        for phrase in ("right?", "is this right", "is that right", "is this correct", "am i correct")
    )
    transfer = any(phrase in message for phrase in ("new context", "transfer", "real world", "another example"))

    if any(phrase in message for phrase in ("i don't know", "i dont know", "don't know", "dont know")):
        return TurnAnalysis(
            concept=concept,
            answer_quality="dont_know",
            hint_used=hint_used,
            transfer=transfer,
            misconception=None,
            asked_for_confirmation=asked_for_confirmation,
        )

    if "switch" in message and ("ip address" in message or "ip addresses" in message):
        return TurnAnalysis(
            concept="switching",
            answer_quality="incorrect",
            hint_used=hint_used,
            transfer=transfer,
            misconception="confuses MAC and IP addressing",
            asked_for_confirmation=asked_for_confirmation,
        )

    if any(phrase in message for phrase in ("routing table", "next hop", "destination network")):
        return TurnAnalysis(
            concept=concept,
            answer_quality="correct",
            hint_used=hint_used,
            transfer=transfer,
            misconception=None,
            asked_for_confirmation=asked_for_confirmation,
        )

    if any(phrase in message for phrase in ("maybe", "partly", "not fully", "kind of")):
        return TurnAnalysis(
            concept=concept,
            answer_quality="partial",
            hint_used=hint_used,
            transfer=transfer,
            misconception=None,
            asked_for_confirmation=asked_for_confirmation,
        )

    return TurnAnalysis(
        concept=concept,
        answer_quality="none",
        hint_used=hint_used,
        transfer=transfer,
        misconception=None,
        asked_for_confirmation=asked_for_confirmation,
    )


def _ask_foundry_for_turn_analysis(student_message: str, tutor_context: dict[str, object]) -> str:
    settings = get_settings()
    if not settings.azure_ai_project_endpoint:
        raise ValueError("AZURE_AI_PROJECT_ENDPOINT is required when ATLAS_LLM_MODE=foundry.")

    openai_client = _foundry_openai_client()
    conversation = openai_client.conversations.create()
    response = openai_client.responses.create(
        conversation=conversation.id,
        input=_turn_analysis_prompt(student_message, tutor_context),
    )
    return response.output_text


def _turn_analysis_prompt(student_message: str, tutor_context: dict[str, object]) -> str:
    return (
        "Analyze this student turn for observable learning signals only. "
        "Return JSON only, with exactly these keys: concept, answer_quality, hint_used, "
        "transfer, misconception, asked_for_confirmation. "
        "answer_quality must be one of: correct, partial, incorrect, dont_know, none. "
        "misconception must be a string or null. Do not diagnose psychological or medical states.\n\n"
        f"Context JSON:\n{json.dumps(tutor_context, ensure_ascii=True)}\n\n"
        f"Student message:\n{student_message}"
    )


def _context_concept(tutor_context: dict[str, object]) -> str:
    topic = tutor_context.get("topic") or tutor_context.get("current_topic")
    return str(topic or "current topic").strip().lower()


def _empty_turn_analysis(tutor_context: dict[str, object]) -> TurnAnalysis:
    return TurnAnalysis(
        concept=_context_concept(tutor_context),
        answer_quality="none",
        hint_used=False,
        transfer=False,
        misconception=None,
        asked_for_confirmation=False,
    )


def grade_short_answer_with_model(
    *,
    student_answer: str,
    correct_answer: str,
    keywords: list[str],
) -> bool | None:
    settings = get_settings()
    if settings.atlas_llm_mode.lower() != "foundry":
        return None
    try:
        raw_response = _ask_foundry_for_short_answer_grade(
            student_answer=student_answer,
            correct_answer=correct_answer,
            keywords=keywords,
        )
        data = json.loads(raw_response)
        return bool(data["correct"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None


def _ask_foundry_for_short_answer_grade(
    *,
    student_answer: str,
    correct_answer: str,
    keywords: list[str],
) -> str:
    settings = get_settings()
    if not settings.azure_ai_project_endpoint:
        raise ValueError("AZURE_AI_PROJECT_ENDPOINT is required when ATLAS_LLM_MODE=foundry.")

    openai_client = _foundry_openai_client()
    conversation = openai_client.conversations.create()
    response = openai_client.responses.create(
        conversation=conversation.id,
        input=(
            "Grade this short answer. Return JSON only as {\"correct\": true|false}. "
            "Use the expected answer and keywords, and do not include any diagnosis or extra text.\n\n"
            f"Expected answer: {correct_answer}\n"
            f"Keywords: {json.dumps(keywords, ensure_ascii=True)}\n"
            f"Student answer: {student_answer}"
        ),
    )
    return response.output_text


def _foundry_openai_client():
    settings = get_settings()

    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential

    project = AIProjectClient(
        endpoint=settings.azure_ai_project_endpoint,
        credential=DefaultAzureCredential(
            exclude_broker_credential=True,
            exclude_shared_token_cache_credential=True,
            exclude_visual_studio_code_credential=True,
        ),
    )
    return project.get_openai_client(
        agent_name=settings.azure_ai_agent_name,
        default_headers={"Accept-Encoding": "gzip, deflate"},
    )


def _student_facing_output(output_text: str) -> str:
    final_start = output_text.find("<final>")
    final_end = output_text.find("</final>")
    if final_start != -1 and final_end != -1 and final_end > final_start:
        return output_text[final_start + len("<final>") : final_end].strip()

    thinking_start = output_text.find("<thinking>")
    thinking_end = output_text.find("</thinking>")
    if thinking_start != -1 and thinking_end != -1 and thinking_end > thinking_start:
        return (output_text[:thinking_start] + output_text[thinking_end + len("</thinking>") :]).strip()

    return output_text

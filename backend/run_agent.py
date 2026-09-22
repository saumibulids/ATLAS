"""Smoke test the live ATLAS Foundry prompt agent."""

from app.agents.foundry_agent import ask_atlas


def main() -> None:
    reply = ask_atlas(
        system_prompt="You are ATLAS. Reply briefly to confirm the live agent is reachable.",
        history=[],
        user_message="Hello",
    )
    print(reply)


if __name__ == "__main__":
    main()

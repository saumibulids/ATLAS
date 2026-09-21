"""Pure misconception tracking helpers."""


def add_misconception(existing_misconceptions: list[str], misconception: str) -> tuple[list[str], bool]:
    """Return a deduplicated misconception list and whether the misconception repeated."""
    normalized = misconception.strip()
    if not normalized:
        return list(existing_misconceptions), False

    repeated = any(item.casefold() == normalized.casefold() for item in existing_misconceptions)
    if repeated:
        return list(existing_misconceptions), True

    return [*existing_misconceptions, normalized], False

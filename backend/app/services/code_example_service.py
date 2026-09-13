import re
import uuid
from typing import Any, Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.code_example import CodeExample

CODE_EXAMPLE_PREFIX = "CODE_EXAMPLE"
PLACEHOLDER_TEMPLATE = "{{" + CODE_EXAMPLE_PREFIX + ":%s}}"

_CODE_BLOCK_RE = re.compile(
    r"```([^\n`]*)\n([\s\S]*?)```",
    re.DOTALL,
)

_PLACEHOLDER_RE = re.compile(
    r"\{\{CODE_EXAMPLE:([^}]+)\}\}",
)


def extract_code_blocks(content: str) -> Tuple[str, List[Dict[str, str]]]:
    extracted: List[Dict[str, str]] = []

    def _replace(match: re.Match) -> str:
        language = match.group(1).strip() or "plaintext"
        code = match.group(2).rstrip("\n")

        example_id = str(uuid.uuid4())

        extracted.append(
            {
                "id": example_id,
                "language": language,
                "code": code,
            }
        )

        return PLACEHOLDER_TEMPLATE % example_id

    processed = _CODE_BLOCK_RE.sub(_replace, content)

    return processed, extracted


def resolve_placeholders(
    content: str,
    examples_by_id: Dict[str, CodeExample],
) -> str:
    def _replace(match: re.Match) -> str:
        example_id = match.group(1)

        example = examples_by_id.get(example_id)

        if not example:
            return match.group(0)

        language = example.language or "plaintext"

        return f"```{language}\n{example.code}\n```"

    return _PLACEHOLDER_RE.sub(_replace, content)


async def store_code_examples(
    db: AsyncSession,
    post_id: int,
    content: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    stored_posts: List[Dict[str, Any]] = []

    for post in content:
        content = post.get("content", "") if isinstance(post, dict) else str(post)

        processed, extracted = extract_code_blocks(content)

        for item in extracted:
            db.add(
                CodeExample(
                    id=item["id"],
                    code=item["code"],
                    language=item["language"],
                    post_id=post_id,
                )
            )

        updated = dict(post) if isinstance(post, dict) else {"content": post}
        updated["content"] = processed
        stored_posts.append(updated)

    await db.commit()

    return stored_posts


async def get_code_examples(
    db: AsyncSession,
    post_id: int,
) -> List[CodeExample]:
    stmt = (
        select(CodeExample)
        .where(CodeExample.post_id == post_id)
        .order_by(CodeExample.created_at.asc(), CodeExample.id.asc())
    )

    result = await db.execute(stmt)

    return list(result.scalars().all())


async def resolve_code_examples(
    db: AsyncSession,
    post_id: int,
    content: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    examples = await get_code_examples(db, post_id)

    examples_by_id = {example.id: example for example in examples}

    resolved_posts: List[Dict[str, Any]] = []

    for post in content:
        content = post.get("content", "") if isinstance(post, dict) else str(post)

        updated = dict(post) if isinstance(post, dict) else {"content": post}
        updated["content"] = resolve_placeholders(content, examples_by_id)
        resolved_posts.append(updated)

    return resolved_posts
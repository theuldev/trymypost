"""Migra os dados do SQLite legado (trymypost.db) para o PostgreSQL.

Uso (na raiz do backend, com o pgvector/postgres de pé):
    python scripts/migrate_sqlite_to_postgres.py

Idempotente: ignora linhas que já existem (por PK).
"""
import asyncio
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  (registra todos os modelos no metadata)
from app.core.config import get_settings
from app.db.session import Base, init_db

SQLITE_PATH = Path(__file__).parent.parent / "trymypost.db"

# colunas por tipo de dado (para converter o texto do SQLite)
JSON_COLUMNS = {
    "posts": {"content", "researched_topics", "hashtags", "hooks", "review",
              "visual_suggestion", "tags"},
    "generation_tasks": {"result"},
}
BOOL_COLUMNS = {
    "posts": {"include_code", "include_visual", "is_favorite"},
    "code_image_presets": {"show_line_numbers"},
    "app_settings": {"rag_rerank"},
}
DATETIME_COLUMNS = {
    "posts": {"created_at", "updated_at", "completed_at", "scheduled_at", "published_at"},
    "posts_edits": {"created_at"},
    "code_examples": {"created_at"},
    "code_image_presets": {"created_at"},
    "app_settings": {"updated_at"},
    "generation_tasks": {"created_at", "updated_at"},
    "post_usage": {"created_at"},
}

TABLES = [
    "app_settings",
    "posts",
    "posts_edits",
    "code_examples",
    "code_image_presets",
    "generation_tasks",
    "post_usage",
]


def _parse_dt(value):
    if value is None or isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _convert(table: str, row: dict) -> dict:
    out = dict(row)
    for col in JSON_COLUMNS.get(table, set()):
        value = out.get(col)
        if isinstance(value, str):
            try:
                out[col] = json.loads(value)
            except json.JSONDecodeError:
                out[col] = None
    for col in BOOL_COLUMNS.get(table, set()):
        if out.get(col) is not None:
            out[col] = bool(out[col])
    for col in DATETIME_COLUMNS.get(table, set()):
        out[col] = _parse_dt(out.get(col))
    return out


async def main() -> None:
    if not SQLITE_PATH.exists():
        print(f"SQLite não encontrado em {SQLITE_PATH} — nada a migrar.")
        return

    await init_db()

    target = create_async_engine(get_settings().database_url)
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    try:
        async with target.begin() as conn:
            from sqlalchemy.ext.asyncio import AsyncConnection
            assert isinstance(conn, AsyncConnection)

            # IDs válidos de posts (para limpar post_usage órfão no SQLite,
            # que não tem enforcement de FK)
            valid_post_ids = set(
                row[0] for row in sqlite_conn.execute("SELECT id FROM posts").fetchall()
            )

            for table_name in TABLES:
                table = Base.metadata.tables[table_name]
                columns = [c.name for c in table.columns]
                try:
                    rows = sqlite_conn.execute(
                        f"SELECT {', '.join(columns)} FROM {table_name}"
                    ).fetchall()
                except sqlite3.OperationalError:
                    print(f"- {table_name}: tabela ausente no SQLite, pulando")
                    continue

                # filtra o que já existe no Postgres pela PK
                existing_ids = set()
                if rows:
                    ids = [row["id"] for row in rows]
                    result = await conn.execute(
                        select(table.c.id).where(table.c.id.in_(ids))
                    )
                    existing_ids = {row[0] for row in result.fetchall()}

                inserted = 0
                for row in rows:
                    if row["id"] in existing_ids:
                        continue
                    data = _convert(table_name, dict(row))
                    if table_name == "post_usage" and data.get("post_id") not in valid_post_ids:
                        data["post_id"] = None
                    await conn.execute(table.insert().values(**data))
                    inserted += 1
                print(f"- {table_name}: {inserted} migrados, {len(rows) - inserted} já existiam")
    finally:
        sqlite_conn.close()
        await target.dispose()


if __name__ == "__main__":
    asyncio.run(main())

import re

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.engine.url import make_url
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def _table_columns(conn, table: str) -> set:
    """Retorna os nomes das colunas de uma tabela, compatível com SQLite e PostgreSQL."""
    if conn.dialect.name == "postgresql":
        safe_table = re.sub(r"[^a-zA-Z0-9_]", "", table)
        result = await conn.exec_driver_sql(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name = '{safe_table}'"
        )
        return {row[0] for row in result.fetchall()}
    result = await conn.exec_driver_sql(f"PRAGMA table_info({table})")
    return {row[1] for row in result.fetchall()}


async def _ensure_postgres_database() -> None:
    """Cria o database da URL se ele ainda não existir (Postgres)."""
    url = make_url(settings.database_url)
    if url.get_backend_name() != "postgresql":
        return
    db_name = url.database
    if not db_name:
        return

    admin_url = url.set(database="postgres")
    admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "", db_name)
        async with admin_engine.connect() as conn:
            exists = await conn.exec_driver_sql(
                f"SELECT 1 FROM pg_database WHERE datname = '{safe_name}'"
            )
            if not exists.fetchone():
                await conn.exec_driver_sql(f'CREATE DATABASE "{safe_name}"')
    finally:
        await admin_engine.dispose()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def _migrate_app_settings_id(conn) -> None:
    """Migra a PK de app_settings de INTEGER (legado) para VARCHAR(36),
    preservando os dados existentes. Apenas SQLite (legado)."""
    if conn.dialect.name != "sqlite":
        return
    result = await conn.exec_driver_sql("PRAGMA table_info(app_settings)")
    columns = result.fetchall()
    id_col = next((c for c in columns if c[1] == "id"), None)
    if id_col is None or "INT" not in id_col[2].upper():
        return

    await conn.exec_driver_sql(
        """
        CREATE TABLE app_settings_new (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            provider VARCHAR(50) NOT NULL,
            model_name VARCHAR(100) NOT NULL,
            api_key VARCHAR(255),
            tavily_api_key VARCHAR(255),
            temperature FLOAT NOT NULL,
            language VARCHAR(10) NOT NULL,
            updated_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        )
        """
    )
    await conn.exec_driver_sql(
        """
        INSERT INTO app_settings_new
        SELECT CAST(id AS TEXT), provider, model_name, api_key,
               tavily_api_key, temperature, language, updated_at
        FROM app_settings
        """
    )
    await conn.exec_driver_sql("DROP TABLE app_settings")
    await conn.exec_driver_sql("ALTER TABLE app_settings_new RENAME TO app_settings")


async def _migrate_code_image_presets_syntax_theme(conn) -> None:
    """Adiciona a coluna syntax_theme em tabelas code_image_presets criadas
    antes da coluna existir (create_all não altera tabelas existentes)."""
    columns = await _table_columns(conn, "code_image_presets")
    if "theme" in columns and "syntax_theme" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE code_image_presets "
            "ADD COLUMN syntax_theme VARCHAR(50) NOT NULL DEFAULT 'vscode-dark'"
        )


async def _migrate_posts_editorial_columns(conn) -> None:
    """Adiciona as colunas de status editorial em tabelas posts criadas
    antes delas existirem (create_all não altera tabelas existentes)."""
    columns = await _table_columns(conn, "posts")
    if not columns:
        return
    if "editorial_status" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE posts "
            "ADD COLUMN editorial_status VARCHAR(20) NOT NULL DEFAULT 'draft'"
        )
    if "scheduled_at" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE posts ADD COLUMN scheduled_at DATETIME"
        )
    if "published_at" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE posts ADD COLUMN published_at DATETIME"
        )


async def _migrate_posts_generated_image(conn) -> None:
    columns = await _table_columns(conn, "posts")
    if columns and "generated_image_url" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE posts ADD COLUMN generated_image_url VARCHAR(500)"
        )


async def _migrate_app_settings_columns(conn) -> None:
    columns = await _table_columns(conn, "app_settings")
    if not columns:
        return
    if "image_provider" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings "
            "ADD COLUMN image_provider VARCHAR(50) NOT NULL DEFAULT 'NONE'"
        )
    if "image_model" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings "
            "ADD COLUMN image_model VARCHAR(100) NOT NULL DEFAULT ''"
        )
    if "image_api_key" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN image_api_key VARCHAR(255)"
        )
    if "guidelines" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN guidelines TEXT NOT NULL DEFAULT ''"
        )
    if "rag_chunk_size" not in columns:
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN rag_chunk_size INTEGER NOT NULL DEFAULT 1200"
        )
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN rag_chunk_overlap INTEGER NOT NULL DEFAULT 200"
        )
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN rag_top_k INTEGER NOT NULL DEFAULT 4"
        )
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN rag_min_score FLOAT NOT NULL DEFAULT 0.5"
        )
        await conn.exec_driver_sql(
            "ALTER TABLE app_settings ADD COLUMN rag_rerank BOOLEAN NOT NULL DEFAULT FALSE"
        )


async def _migrate_user_profiles_table(conn) -> None:
    """Cria a tabela user_profiles se não existir (SQLite compat)."""
    columns = await _table_columns(conn, "user_profiles")
    if not columns:
        # Tabela não existe, create_all vai criar
        return
    # Se a tabela existe mas faltam colunas, adiciona (para migrações parciais)
    if "full_name" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN full_name VARCHAR(200)")
    if "phone" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(50)")
    if "whatsapp" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN whatsapp VARCHAR(50)")
    if "linkedin_url" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN linkedin_url VARCHAR(500)")
    if "github_url" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN github_url VARCHAR(500)")
    if "experience_summary" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN experience_summary TEXT")
    if "salary_expectation" not in columns:
        await conn.exec_driver_sql("ALTER TABLE user_profiles ADD COLUMN salary_expectation VARCHAR(200)")


async def _migrate_email_generations_table(conn) -> None:
    """Cria a tabela email_generations se não existir (SQLite compat)."""
    columns = await _table_columns(conn, "email_generations")
    if not columns:
        # Tabela não existe, create_all vai criar
        return
    # Adiciona colunas faltando se necessário
    if "job_title" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN job_title VARCHAR(200)")
    if "company_name" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN company_name VARCHAR(200)")
    if "recruiter_name" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN recruiter_name VARCHAR(200)")
    if "recruiter_email" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN recruiter_email VARCHAR(200)")
    if "key_requirements" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN key_requirements JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN key_requirements TEXT")
    if "technologies" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN technologies JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN technologies TEXT")
    if "experience_desired" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN experience_desired JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN experience_desired TEXT")
    if "location_modality" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN location_modality VARCHAR(200)")
    if "salary_info" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN salary_info VARCHAR(500)")
    if "salary_expectation_required" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN salary_expectation_required BOOLEAN NOT NULL DEFAULT FALSE")
    if "recipient_email" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN recipient_email VARCHAR(200)")
    if "subject" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN subject VARCHAR(500) NOT NULL DEFAULT ''")
    if "body" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN body TEXT NOT NULL DEFAULT ''")
    if "model_used" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN model_used VARCHAR(100)")
    if "tavily_searches_performed" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN tavily_searches_performed VARCHAR(10) NOT NULL DEFAULT '0'")
    if "generation_time_ms" not in columns:
        await conn.exec_driver_sql("ALTER TABLE email_generations ADD COLUMN generation_time_ms VARCHAR(20)")


async def _migrate_audit_logs_table(conn) -> None:
    """Cria a tabela audit_logs se não existir (SQLite compat)."""
    columns = await _table_columns(conn, "audit_logs")
    if not columns:
        # Tabela não existe, create_all vai criar
        return
    # Se a tabela existe mas faltam colunas, adiciona
    if "event_type" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN event_type VARCHAR(50) NOT NULL DEFAULT ''")
    if "event_category" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN event_category VARCHAR(50) NOT NULL DEFAULT ''")
    if "action" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN action VARCHAR(100) NOT NULL DEFAULT ''")
    if "status" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''")
    if "resource_type" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN resource_type VARCHAR(50)")
    if "resource_id" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(36)")
    if "user_id" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN user_id VARCHAR(36)")
    if "ip_address" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45)")
    if "user_agent" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN user_agent TEXT")
    if "message" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN message TEXT")
    if "request_data" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN request_data JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN request_data TEXT")
    if "response_data" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN response_data JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN response_data TEXT")
    if "error_details" not in columns:
        if conn.dialect.name == "postgresql":
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN error_details JSON")
        else:
            await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN error_details TEXT")
    if "duration_ms" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN duration_ms VARCHAR(20)")
    if "correlation_id" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(36)")
    if "parent_event_id" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN parent_event_id VARCHAR(36)")
    if "created_at" not in columns:
        await conn.exec_driver_sql("ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL")


async def _migrate_job_analyses_table(conn) -> None:
    """Adiciona colunas faltantes em job_analyses criadas parcialmente
    (create_all não altera tabelas existentes)."""
    columns = await _table_columns(conn, "job_analyses")
    if not columns:
        # Tabela não existe, create_all vai criar
        return
    additions = {
        "task_id": "ALTER TABLE job_analyses ADD COLUMN task_id VARCHAR(36) NOT NULL DEFAULT ''",
        "job_description": "ALTER TABLE job_analyses ADD COLUMN job_description TEXT NOT NULL DEFAULT ''",
        "job_url": "ALTER TABLE job_analyses ADD COLUMN job_url VARCHAR(500)",
        "job_title": "ALTER TABLE job_analyses ADD COLUMN job_title VARCHAR(200)",
        "company_name": "ALTER TABLE job_analyses ADD COLUMN company_name VARCHAR(200)",
        "seniority": "ALTER TABLE job_analyses ADD COLUMN seniority VARCHAR(50)",
        "work_model": "ALTER TABLE job_analyses ADD COLUMN work_model VARCHAR(50)",
        "location": "ALTER TABLE job_analyses ADD COLUMN location VARCHAR(200)",
        "contract_type": "ALTER TABLE job_analyses ADD COLUMN contract_type VARCHAR(100)",
        "score": "ALTER TABLE job_analyses ADD COLUMN score INTEGER",
        "match_classification": "ALTER TABLE job_analyses ADD COLUMN match_classification VARCHAR(30)",
        "salary_recommended_min": "ALTER TABLE job_analyses ADD COLUMN salary_recommended_min INTEGER",
        "salary_recommended_max": "ALTER TABLE job_analyses ADD COLUMN salary_recommended_max INTEGER",
        "salary_suggested": "ALTER TABLE job_analyses ADD COLUMN salary_suggested INTEGER",
        "result": "ALTER TABLE job_analyses ADD COLUMN result JSON",
        "model_used": "ALTER TABLE job_analyses ADD COLUMN model_used VARCHAR(100)",
        "completed_at": "ALTER TABLE job_analyses ADD COLUMN completed_at DATETIME",
    }
    for column, ddl in additions.items():
        if column not in columns:
            await conn.exec_driver_sql(ddl)


async def init_db() -> None:
    await _ensure_postgres_database()
    async with engine.begin() as conn:
        await _migrate_app_settings_id(conn)
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_code_image_presets_syntax_theme(conn)
        await _migrate_posts_editorial_columns(conn)
        await _migrate_posts_generated_image(conn)
        await _migrate_app_settings_columns(conn)
        await _migrate_user_profiles_table(conn)
        await _migrate_email_generations_table(conn)
        await _migrate_audit_logs_table(conn)
        await _migrate_job_analyses_table(conn)
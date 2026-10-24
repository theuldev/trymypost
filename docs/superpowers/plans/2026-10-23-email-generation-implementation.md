# Email Generation Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete end-to-end job application email generation feature with user profile management, LangChain pipeline with Tavily research, structured output, React frontend with SSE progress, and history persistence.

**Architecture:** New independent pipeline following existing patterns (RabbitMQ + SSE + GenerationTask), new UserProfile and EmailGeneration tables with 1:1 to AppSettings, three LangChain prompts (analyzer, researcher, generator), React pages mirroring Playground patterns.

**Tech Stack:** FastAPI, SQLAlchemy async, LangChain, Tavily, React 18, TypeScript, Zustand, TanStack Query, Tailwind CSS, RabbitMQ/aio-pika, PostgreSQL/SQLite.

**Spec:** `docs/superpowers/specs/2026-10-23-email-generation-feature-design.md`

---

## Global Constraints

- Follow existing project patterns exactly: routers, services, repositories, schemas, models, prompts, worker pipeline
- No parallel architecture — reuse `GenerationTask`, `UsageTracker`, `task_events`, `LLMService`, `search_service`
- Structured JSON output from all LLM calls (parse with existing `_parse_json`)
- Tavily only via `search_service.run_with_web_search` / `create_web_search_tool`
- SSE progress via existing `TASK_EVENTS_CHANNEL` and `EventSource` on frontend
- User profile stored in DB, not localStorage — API endpoints for CRUD
- All new strings via i18n system (`useTranslation`, translation dicts)
- Copy-to-clipboard with toast feedback (reuse `addToast` from `useUIStore`)
- Minimum job description length: 50 characters
- Maximum job description length: 10000 characters

---

## Review Focus

1. **Salary expectation detection ambiguity** — Job says "Salary: R$ 5000-7000" (offered) vs "Inform your salary expectation" (required) vs unclear. Test: Tavily research triggered correctly, template selected correctly.
2. **Recruiter email extraction** — Only explicit emails returned, never synthesized from name+domain. Test: null when not found, valid email when present in description.
3. **Missing user profile** — Generation fails gracefully with clear error prompting profile setup. Test: 400 error with actionable message.
4. **Tavily API failures** — Pipeline continues with extracted info only, doesn't crash. Test: Mock Tavily error, verify fallback.
5. **Empty/partial profile fields** — Email omits missing contact lines cleanly. Test: Profile with only name, verify output format.

---

## File Structure Map

### Backend New Files
```
backend/app/models/user_profile.py
backend/app/models/email_generation.py
backend/app/schemas/email_generation.py
backend/app/repositories/user_profile_repository.py
backend/app/repositories/email_generation_repository.py
backend/app/services/email_pipeline_service.py
backend/app/prompts/email_analyzer.yaml
backend/app/prompts/email_tavily_researcher.yaml
backend/app/prompts/email_generator.yaml
```

### Backend Modified Files
```
backend/app/models/__init__.py
backend/app/models/app_settings.py
backend/app/schemas/__init__.py
backend/app/repositories/__init__.py
backend/app/services/__init__.py
backend/app/api/routes.py
backend/worker.py
backend/app/db/session.py
```

### Frontend New Files
```
frontend/src/types/email.ts
frontend/src/services/emails.ts
frontend/src/store/emailStore.ts
frontend/src/features/email-generation/i18n.ts
frontend/src/features/email-generation/pages/EmailGenerationPage.tsx
frontend/src/features/email-generation/pages/EmailGenerationResultsPage.tsx
frontend/src/features/email-generation/pages/EmailHistoryPage.tsx
frontend/src/features/email-generation/components/EmailGenerationForm.tsx
frontend/src/features/email-generation/components/EmailResultCard.tsx
frontend/src/features/email-generation/components/ExtractedInfoPanel.tsx
frontend/src/features/email-generation/components/CopyButton.tsx
```

### Frontend Modified Files
```
frontend/src/types/index.ts
frontend/src/services/posts.ts
frontend/src/store/index.ts
frontend/src/app/routes.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/features/settings/pages/SettingsPage.tsx
frontend/src/i18n/index.ts
frontend/src/i18n/layout.ts
```

---

## Phase 1: Database & Backend Core

### Task 1.1: Create UserProfile Model

**Files:**
- Create: `backend/app/models/user_profile.py`
- Modify: `backend/app/models/__init__.py`, `backend/app/models/app_settings.py`

**Interfaces:**
- Produces: `UserProfile` SQLAlchemy model with columns: `id`, `app_settings_id` (FK, unique), `full_name`, `phone`, `whatsapp`, `linkedin_url`, `github_url`, timestamps
- Produces: `AppSettings.user_profile` relationship (uselist=False, cascade)

- [ ] **Step 1: Write failing test for model creation**
```python
# tests/test_user_profile_model.py
async def test_user_profile_model_creation(db_session):
    from app.models.user_profile import UserProfile
    from app.models.app_settings import AppSettings
    import uuid
    
    settings = AppSettings(id=str(uuid.uuid4()))
    db_session.add(settings)
    await db_session.commit()
    
    profile = UserProfile(
        id=str(uuid.uuid4()),
        app_settings_id=settings.id,
        full_name="Test User",
        phone="+55 11 99999-9999",
        linkedin_url="https://linkedin.com/in/test"
    )
    db_session.add(profile)
    await db_session.commit()
    
    loaded = await db_session.get(UserProfile, profile.id)
    assert loaded.full_name == "Test User"
    assert loaded.app_settings_id == settings.id
```

- [ ] **Step 2: Run test to verify it fails**
```bash
pytest tests/test_user_profile_model.py::test_user_profile_model_creation -v
# Expected: FAIL - module not found
```

- [ ] **Step 3: Implement `UserProfile` model in `backend/app/models/user_profile.py`**
```python
# Exact signature per spec section 1.1
# Include ForeignKey to app_settings.id, unique constraint
# Include relationship back_populates="user_profile"
```

- [ ] **Step 4: Update `backend/app/models/__init__.py` to export UserProfile**

- [ ] **Step 5: Update `backend/app/models/app_settings.py` to add `user_profile` relationship**

- [ ] **Step 6: Run test to verify it passes**

- [ ] **Step 7: Commit**
```bash
git add backend/app/models/user_profile.py backend/app/models/__init__.py backend/app/models/app_settings.py tests/test_user_profile_model.py
git commit -m "feat: add UserProfile model with 1:1 to AppSettings"
```

### Task 1.2: Create EmailGeneration Model

**Files:**
- Create: `backend/app/models/email_generation.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: `EmailGeneration` SQLAlchemy model per spec section 1.2
- All columns: id, task_id, job_description, extracted fields, output fields, metadata, timestamps

- [ ] **Step 1: Write failing test**
```python
# tests/test_email_generation_model.py
async def test_email_generation_model_creation(db_session):
    from app.models.email_generation import EmailGeneration
    import uuid
    
    eg = EmailGeneration(
        id=str(uuid.uuid4()),
        task_id=str(uuid.uuid4()),
        job_description="Senior Python Developer...",
        job_title="Senior Python Developer",
        company_name="TechCorp",
        recipient_email="hr@techcorp.com",
        subject="Candidatura: Senior Python Developer - João Silva",
        body="Olá...",
        salary_expectation_required=False
    )
    db_session.add(eg)
    await db_session.commit()
    
    loaded = await db_session.get(EmailGeneration, eg.id)
    assert loaded.job_title == "Senior Python Developer"
    assert loaded.recipient_email == "hr@techcorp.com"
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `EmailGeneration` model in `backend/app/models/email_generation.py`**

- [ ] **Step 4: Update `backend/app/models/__init__.py` to export EmailGeneration**

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Commit**

### Task 1.3: Add Database Migration for New Tables

**Files:**
- Modify: `backend/app/db/session.py` (add migration functions)
- Create: `backend/scripts/migrate_add_email_generation.py` (standalone migration script)

**Interfaces:**
- Produces: Migration functions `_migrate_user_profiles_table`, `_migrate_email_generations_table` in `session.py`
- Produces: Standalone script for manual migration if needed

- [ ] **Step 1: Write migration functions in `session.py`**
```python
# Add to session.py after existing migrations
async def _migrate_user_profiles_table(conn) -> None:
    columns = await _table_columns(conn, "user_profiles")
    if not columns:
        # Table doesn't exist, create_all will handle it
        return
    # Add any missing columns for SQLite compatibility

async def _migrate_email_generations_table(conn) -> None:
    columns = await _table_columns(conn, "email_generations")
    if not columns:
        return
    # Add any missing columns
```

- [ ] **Step 2: Register migrations in `init_db()` function**

- [ ] **Step 3: Create standalone migration script for manual runs**

- [ ] **Step 4: Test migration on SQLite and PostgreSQL**

- [ ] **Step 5: Commit**

### Task 1.4: Create UserProfile Repository

**Files:**
- Create: `backend/app/repositories/user_profile_repository.py`
- Modify: `backend/app/repositories/__init__.py`
- Test: `tests/test_user_profile_repository.py`

**Interfaces:**
- Consumes: `UserProfile` model, `AsyncSession`
- Produces: `UserProfileRepository` class with static methods:
  - `get_by_app_settings_id(db, app_settings_id) -> Optional[UserProfile]`
  - `create(db, app_settings_id) -> UserProfile`
  - `update(db, profile, data) -> UserProfile`
  - `get_or_create(db, app_settings_id) -> UserProfile`

- [ ] **Step 1: Write failing tests for all 4 methods**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement repository class following `AppSettingsRepository` pattern**

- [ ] **Step 4: Export from `repositories/__init__.py`**

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

### Task 1.5: Create EmailGeneration Repository

**Files:**
- Create: `backend/app/repositories/email_generation_repository.py`
- Modify: `backend/app/repositories/__init__.py`
- Test: `tests/test_email_generation_repository.py`

**Interfaces:**
- Consumes: `EmailGeneration` model, `AsyncSession`
- Produces: `EmailGenerationRepository` with:
  - `create(db, data) -> EmailGeneration`
  - `get_by_task_id(db, task_id) -> Optional[EmailGeneration]`
  - `list_history(db, page, page_size, search) -> Tuple[List[EmailGeneration], int]`

- [ ] **Step 1: Write failing tests**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement repository with pagination and search**

- [ ] **Step 4: Export from `repositories/__init__.py`**

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

### Task 1.6: Create Email Generation Schemas

**Files:**
- Create: `backend/app/schemas/email_generation.py`
- Modify: `backend/app/schemas/__init__.py`
- Test: `tests/test_email_generation_schemas.py`

**Interfaces:**
- Produces: All Pydantic models from spec section 2.1:
  - `UserProfileUpdate`, `UserProfileResponse`
  - `GenerateEmailRequest`, `ExtractedJobInfo`
  - `GenerateEmailResponse`, `EmailGenerationResult`
  - `EmailGenerationHistoryItem`, `EmailGenerationHistoryResponse`

- [ ] **Step 1: Write failing validation tests**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement schemas with exact fields, validators, ConfigDict**

- [ ] **Step 4: Export from `schemas/__init__.py`**

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

### Task 1.7: Add Profile Endpoints to Router

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `tests/test_profile_endpoints.py`

**Interfaces:**
- Consumes: `UserProfileRepository`, `UserProfileUpdate`, `UserProfileResponse`, `get_db`
- Produces: 
  - `GET /api/v1/profile` → `UserProfileResponse`
  - `PUT /api/v1/profile` → `UserProfileResponse`

- [ ] **Step 1: Write failing integration tests**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement endpoints following `settings` endpoint pattern**
```python
@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(db: AsyncSession = Depends(get_db)):
    settings = await AppSettingsRepository.get(db)
    if not settings:
        settings = AppSettings(id=str(uuid.uuid4()))
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    profile = await UserProfileRepository.get_or_create(db, settings.id)
    return UserProfileResponse.model_validate(profile)
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 1.8: Add Email Generation Endpoints to Router

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `tests/test_email_generation_endpoints.py`

**Interfaces:**
- Consumes: `EmailGenerationRepository`, `GenerateEmailRequest`, `GenerateEmailResponse`, `TaskStatusResponse`, `start_email_generation_task` (from pipeline service)
- Produces:
  - `POST /api/v1/emails/generate` → `GenerateEmailResponse`
  - `GET /api/v1/emails/generate/{task_id}` → `TaskStatusResponse`
  - `GET /api/v1/emails/generate/{task_id}/events` → SSE stream
  - `POST /api/v1/emails/generate/{task_id}/cancel` → cancel
  - `GET /api/v1/emails/history` → `EmailGenerationHistoryResponse`
  - `GET /api/v1/emails/history/{email_id}` → `EmailGenerationResult`
  - `DELETE /api/v1/emails/history/{email_id}` → delete

- [ ] **Step 1: Write failing integration tests for all endpoints**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement endpoints following `posts/generate` pattern exactly**

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

---

## Phase 2: LangChain Pipeline

### Task 2.1: Create Email Analyzer Prompt

**Files:**
- Create: `backend/app/prompts/email_analyzer.yaml`
- Test: `tests/test_email_analyzer_prompt.py`

**Interfaces:**
- Produces: YAML prompt file with `input_variables: ["job_description"]`
- Template returns structured JSON per spec

- [ ] **Step 1: Write test that loads prompt and validates structure**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Create YAML file with exact template from spec section 3.1**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.2: Create Email Tavily Researcher Prompt

**Files:**
- Create: `backend/app/prompts/email_tavily_researcher.yaml`
- Test: `tests/test_email_tavily_researcher_prompt.py`

**Interfaces:**
- Produces: YAML prompt with `input_variables: ["job_description", "missing_fields", "extracted_info"]`

- [ ] **Step 1: Write test**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Create YAML file with exact template from spec section 3.1**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.3: Create Email Generator Prompt

**Files:**
- Create: `backend/app/prompts/email_generator.yaml`
- Test: `tests/test_email_generator_prompt.py`

**Interfaces:**
- Produces: YAML prompt with `input_variables: ["job_description", "extracted_info", "user_profile", "salary_expectation_required"]`

- [ ] **Step 1: Write test**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Create YAML file with exact template from spec section 3.1 (both templates)**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.4: Register Prompts in Prompts Service

**Files:**
- Modify: `backend/app/services/prompts_service.py`
- Test: `tests/test_prompts_service_email.py`

**Interfaces:**
- Consumes: `PROMPT_FILES` dict, `load_prompts()` function
- Produces: Updated `PROMPT_FILES` with 3 new entries

- [ ] **Step 1: Add entries to `PROMPT_FILES` dict**
```python
"email_analyzer": "email_analyzer.yaml",
"email_tavily_researcher": "email_tavily_researcher.yaml",
"email_generator": "email_generator.yaml",
```

- [ ] **Step 2: Write test verifying `get_prompt()` returns all 3**

- [ ] **Step 3: Run test to verify it passes**

- [ ] **Step 4: Commit**

### Task 2.5: Implement Email Pipeline Service - Core Structure

**Files:**
- Create: `backend/app/services/email_pipeline_service.py`
- Modify: `backend/app/services/__init__.py`
- Test: `tests/test_email_pipeline_service.py`

**Interfaces:**
- Consumes: `LLMService`, `UsageTracker`, `AppSettings`, `EmailGenerationRepository`, `UserProfileRepository`, `_parse_json`, `run_with_web_search`, `notify_task_event`
- Produces: `run_email_generation_pipeline(task_id, input_data)` async function

- [ ] **Step 1: Write failing test for pipeline function signature**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement skeleton with all imports, function signature, basic structure matching `run_generation_pipeline` pattern**

- [ ] **Step 4: Run test to verify it passes (imports work)**

- [ ] **Step 5: Commit**

### Task 2.6: Implement Pipeline Step 1 - Job Description Analysis

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_step1.py`

**Interfaces:**
- Consumes: `llm`, `job_description`, `tavily_api_key`, `tracker`
- Produces: `extracted_info` dict with all fields from `ExtractedJobInfo`

- [ ] **Step 1: Write test with mocked LLM returning known JSON**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `_run_job_analysis(llm, job_description, tavily_api_key, tracker)`**
```python
# Load email_analyzer prompt
# Format with job_description
# Call LLM with structured output parsing
# Return parsed ExtractedJobInfo dict
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.7: Implement Pipeline Step 2 - Tavily Research Decision Logic

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_step2.py`

**Interfaces:**
- Consumes: `extracted_info` dict
- Produces: `needs_research` bool, `missing_fields` list

- [ ] **Step 1: Write tests for various scenarios:**
  - All fields present → no research
  - Missing recruiter_email → research
  - Missing company_name → research
  - salary_expectation_required unclear → research

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `_should_research(extracted_info) -> (bool, list[str])`**

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 2.8: Implement Pipeline Step 3 - Tavily Research

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_step3.py`

**Interfaces:**
- Consumes: `llm`, `job_description`, `missing_fields`, `extracted_info`, `tavily_api_key`, `tracker`
- Produces: `researched_info` dict (merged with extracted_info)

- [ ] **Step 1: Write test with mocked `run_with_web_search`**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `_run_tavily_research(llm, job_description, missing_fields, extracted_info, tavily_api_key, tracker)`**
```python
# Load email_tavily_researcher prompt
# Format with variables
# Call run_with_web_search (reuse existing)
# Parse and merge results
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.9: Implement Pipeline Step 4 - User Profile Retrieval

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_step4.py`

**Interfaces:**
- Consumes: `db`, `app_settings_id` (from settings)
- Produces: `user_profile` dict with `full_name`, `phone_or_whatsapp`, `linkedin_url`, `github_url`

- [ ] **Step 1: Write test with mocked repository**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `_get_user_profile(db, app_settings_id)`**
```python
# Get settings from AppSettingsRepository
# Get or create UserProfile
# Return formatted dict, combining phone/whatsapp
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 6: Commit**

### Task 2.10: Implement Pipeline Step 5 - Email Generation

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_step5.py`

**Interfaces:**
- Consumes: `llm`, `job_description`, `merged_info`, `user_profile`, `salary_expectation_required`, `tracker`
- Produces: `result` dict with `recipient_email`, `subject`, `body`

- [ ] **Step 1: Write test with mocked LLM returning both template variants**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement `_run_email_generation(llm, job_description, merged_info, user_profile, salary_expectation_required, tracker)`**
```python
# Load email_generator prompt
# Format with all variables (including user_profile dict)
# Call LLM with structured output
# Parse JSON, validate required fields
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.11: Implement Pipeline Step 6 - Persistence & Task Completion

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_persistence.py`

**Interfaces:**
- Consumes: `db`, `task_id`, `input_data`, `result`, `merged_info`, `tracker`, `generation_time_ms`
- Produces: Persisted `EmailGeneration` record, updated `GenerationTask`

- [ ] **Step 1: Write test with mocked db session**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement persistence logic following `run_generation_pipeline` pattern:**
```python
# Create EmailGeneration record with all fields
# Update GenerationTask with result, status=COMPLETED
# Persist usage records from tracker
# Commit and notify
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

### Task 2.12: Wire Full Pipeline in `run_email_generation_pipeline`

**Files:**
- Modify: `backend/app/services/email_pipeline_service.py`
- Test: `tests/test_email_pipeline_full.py`

**Interfaces:**
- Consumes: `task_id`, `input_data` (with `job_description`)
- Produces: Complete pipeline execution with all steps

- [ ] **Step 1: Write integration test with mocked LLM, Tavily, DB**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement full function orchestrating all steps with progress updates**

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

## Phase 3: Worker & Queue Integration

### Task 3.1: Add Email Generation Queue Consumer to Worker

**Files:**
- Modify: `backend/worker.py`
- Test: `tests/test_worker_email_queue.py`

**Interfaces:**
- Consumes: `run_email_generation_pipeline`, `aio_pika`, RabbitMQ connection
- Produces: Consumer for `email_generation_tasks` queue

- [ ] **Step 1: Add import for `run_email_generation_pipeline`**

- [ ] **Step 2: Add `consume_email_generation_tasks()` async function following existing consumer pattern**

- [ ] **Step 3: Register consumer in worker startup (main block)**

- [ ] **Step 4: Write test verifying consumer registration**

- [ ] **Step 5: Run test to verify it passes**

- [ ] **Step 6: Commit**

### Task 3.2: Add Pipeline Publish Function

**Files:**
- Modify: `backend/app/services/pipeline_service.py` or create `email_pipeline_service.py` publish function
- Test: `tests/test_email_pipeline_publish.py`

**Interfaces:**
- Consumes: `task_id`, `input_data`, RabbitMQ settings
- Produces: Message published to `email_generation_tasks` queue

- [ ] **Step 1: Add `publish_email_generation_task(task_id, input_data)` function**

- [ ] **Step 2: Write test verifying message format**

- [ ] **Step 3: Run test to verify it passes**

- [ ] **Step 4: Commit**

### Task 3.3: Add `start_email_generation_task` Function

**Files:**
- Modify: `backend/app/services/pipeline_service.py` (add new function) or `email_pipeline_service.py`
- Test: `tests/test_start_email_generation_task.py`

**Interfaces:**
- Consumes: `db`, `input_data` dict
- Produces: `task_id` string, creates `GenerationTask`, publishes to queue

- [ ] **Step 1: Implement following `start_generation_task` pattern exactly**

- [ ] **Step 2: Write test**

- [ ] **Step 3: Run test to verify it passes**

- [ ] **Step 4: Commit**

---

## Phase 4: Frontend - Core Feature

### Task 4.1: Create Frontend Types

**Files:**
- Create: `frontend/src/types/email.ts`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Produces: All TypeScript interfaces from spec section 4.1

- [ ] **Step 1: Create `email.ts` with exact interfaces**

- [ ] **Step 2: Export from `types/index.ts`**

- [ ] **Step 3: Commit**

### Task 4.2: Create Email API Service

**Files:**
- Create: `frontend/src/services/emails.ts`
- Modify: `frontend/src/services/posts.ts` (export emailApi)

**Interfaces:**
- Consumes: `api` instance, TypeScript types
- Produces: `emailApi` object with all 7 methods from spec section 4.2

- [ ] **Step 1: Implement service following `postsApi` pattern exactly**

- [ ] **Step 2: Export from `posts.ts`**

- [ ] **Step 3: Commit**

### Task 4.3: Create Email Generation Store

**Files:**
- Create: `frontend/src/store/emailStore.ts`
- Modify: `frontend/src/store/index.ts`

**Interfaces:**
- Produces: `useEmailGenerationStore` Zustand store with state and actions from spec section 4.3

- [ ] **Step 1: Implement store following `useGenerationStore` pattern**

- [ ] **Step 2: Export from `store/index.ts`**

- [ ] **Step 3: Commit**

### Task 4.4: Create Email Generation i18n

**Files:**
- Create: `frontend/src/features/email-generation/i18n.ts`
- Modify: `frontend/src/i18n/index.ts`

**Interfaces:**
- Produces: `emailGenerationDict` with pt-BR and en-US translations

- [ ] **Step 1: Create translation dict with all keys from spec section 4.8**

- [ ] **Step 2: Import and merge in `i18n/index.ts`**

- [ ] **Step 3: Commit**

### Task 4.5: Create CopyButton Component

**Files:**
- Create: `frontend/src/features/email-generation/components/CopyButton.tsx`
- Test: Manual verification

**Interfaces:**
- Consumes: `children`, `textToCopy`, `onSuccess` callback
- Produces: Button with copy icon, tooltip/toast feedback

- [ ] **Step 1: Implement component reusing `Button`, `useUIStore` for toasts**

- [ ] **Step 2: Test manually in browser**

- [ ] **Step 3: Commit**

### Task 4.6: Create EmailGenerationForm Component

**Files:**
- Create: `frontend/src/features/email-generation/components/EmailGenerationForm.tsx`

**Interfaces:**
- Consumes: `description`, `onChange`, `onSubmit`, `isSubmitting`, `isGenerating`, validation error
- Produces: Form with textarea, char counter, submit button

- [ ] **Step 1: Implement following `DescriptionForm` pattern from Playground**

- [ ] **Step 2: Commit**

### Task 4.7: Create ExtractedInfoPanel Component

**Files:**
- Create: `frontend/src/features/email-generation/components/ExtractedInfoPanel.tsx`

**Interfaces:**
- Consumes: `ExtractedJobInfo` object
- Produces: Collapsible panel showing all extracted fields

- [ ] **Step 1: Implement with Card, badges for arrays, conditional rendering**

- [ ] **Step 2: Commit**

### Task 4.8: Create EmailResultCard Component

**Files:**
- Create: `frontend/src/features/email-generation/components/EmailResultCard.tsx`

**Interfaces:**
- Consumes: `EmailGenerationResult`, `onCopyEmail`, `onCopySubject`, `onCopyBody`, `onCopyAll`
- Produces: Card with recipient, subject, body, copy actions

- [ ] **Step 1: Implement with proper null handling for recipient_email**

- [ ] **Step 2: Commit**

### Task 4.9: Create EmailGenerationPage

**Files:**
- Create: `frontend/src/features/email-generation/pages/EmailGenerationPage.tsx`
- Test: Manual E2E

**Interfaces:**
- Consumes: `useEmailGenerationStore`, `emailApi`, `useUIStore`, `useTranslation`, `GenerationLoadingOverlay`, `EmailGenerationForm`
- Produces: Page with form, SSE progress handling, navigation to results

- [ ] **Step 1: Implement following `PlaygroundPage` pattern exactly:**
  - SSE EventSource connection
  - `handleSubmit` calling `emailApi.generate`
  - Progress tracking via `updateProgress`
  - Terminal state handling → navigate to results
  - Loading overlay when `isGenerating`

- [ ] **Step 2: Test manually with backend running**

- [ ] **Step 3: Commit**

### Task 4.10: Create EmailGenerationResultsPage

**Files:**
- Create: `frontend/src/features/email-generation/pages/EmailGenerationResultsPage.tsx`
- Test: Manual E2E

**Interfaces:**
- Consumes: `useEmailGenerationStore`, `emailApi`, `useUIStore`, `useTranslation`, `useNavigate`, `useLocation`, `EmailResultCard`, `ExtractedInfoPanel`
- Produces: Results page with email display, copy actions, extracted info, back button

- [ ] **Step 1: Implement reading result from store (set by SSE handler)**

- [ ] **Step 2: Add copy handlers with `navigator.clipboard.writeText` and toast feedback**

- [ ] **Step 3: Test manually**

- [ ] **Step 4: Commit**

### Task 4.11: Add Routing and Sidebar Navigation

**Files:**
- Modify: `frontend/src/app/routes.tsx`, `frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces: 3 new routes, sidebar entry with Mail icon

- [ ] **Step 1: Add routes in `routes.tsx`**

- [ ] **Step 2: Add `Mail` icon import and navigation item in `Sidebar.tsx`**

- [ ] **Step 3: Add sidebar translations in `i18n/layout.ts`**

- [ ] **Step 4: Commit**

---

## Phase 5: Frontend - Settings Integration

### Task 5.1: Add Profile Section to SettingsPage

**Files:**
- Modify: `frontend/src/features/settings/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `emailApi.getProfile`, `emailApi.updateProfile`, `useUIStore`, `useTranslation`
- Produces: New section in Settings with 4 fields (name, phone/whatsapp, LinkedIn, GitHub)

- [ ] **Step 1: Add state variables for profile fields**

- [ ] **Step 2: Add `useQuery` for fetching profile on mount**

- [ ] **Step 3: Add `useMutation` for updating profile**

- [ ] **Step 4: Add UI section following existing patterns (Card, Input, Button)**

- [ ] **Step 5: Add i18n keys for all labels/placeholders**

- [ ] **Step 6: Test manually**

- [ ] **Step 7: Commit**

---

## Phase 6: History & Polish

### Task 6.1: Create EmailHistoryPage

**Files:**
- Create: `frontend/src/features/email-generation/pages/EmailHistoryPage.tsx`
- Test: Manual E2E

**Interfaces:**
- Consumes: `emailApi.listHistory`, `emailApi.getDetail`, `emailApi.delete`, `useUIStore`, `useTranslation`
- Produces: Paginated list with search, click to view detail, delete action

- [ ] **Step 1: Implement following `HistoryPage` pattern**

- [ ] **Step 2: Add route in `routes.tsx`**

- [ ] **Step 3: Add sidebar navigation entry (optional, or link from results page)**

- [ ] **Step 4: Commit**

### Task 6.2: Add Remaining i18n Translations

**Files:**
- Modify: `frontend/src/features/email-generation/i18n.ts`

**Interfaces:**
- Produces: Complete translation coverage for all UI strings

- [ ] **Step 1: Audit all components for hardcoded strings**

- [ ] **Step 2: Add missing translations for pt-BR and en-US**

- [ ] **Step 3: Commit**

### Task 6.3: Error Handling & Edge Cases

**Files:**
- Modify: Various frontend components

**Interfaces:**
- Produces: Proper error states for:
  - Empty job description validation
  - API errors (toast messages)
  - Missing profile (redirect to settings)
  - Null recipient_email display
  - Copy failures

- [ ] **Step 1: Add validation in `EmailGenerationForm` (min 50 chars)**

- [ ] **Step 2: Add error handling in `EmailGenerationPage` submit**

- [ ] **Step 3: Add null recipient_email display in `EmailResultCard`**

- [ ] **Step 4: Commit**

---

## Phase 7: Testing

### Task 7.1: Backend Unit Tests

**Files:**
- Create: `tests/test_email_analyzer_prompt.py`
- Create: `tests/test_email_generator_prompt.py`
- Create: `tests/test_user_profile_repository.py`
- Create: `tests/test_email_generation_repository.py`

- [ ] **Step 1: Implement all unit tests per spec section 8.1**

- [ ] **Step 2: Run all backend tests**
```bash
cd backend && pytest tests/ -v -k "email" --tb=short
```

- [ ] **Step 3: Fix any failures**

- [ ] **Step 4: Commit**

### Task 7.2: Backend Integration Tests

**Files:**
- Create: `tests/test_email_generation_api.py`
- Create: `tests/test_email_pipeline.py`
- Create: `tests/test_profile_settings.py`

- [ ] **Step 1: Implement integration tests per spec section 8.2**

- [ ] **Step 2: Run integration tests**

- [ ] **Step 3: Fix any failures**

- [ ] **Step 4: Commit**

### Task 7.3: E2E Verification

**Files:**
- Manual testing checklist

**Interfaces:**
- Produces: Verified working feature end-to-end

- [ ] **Step 1: Test all 10 scenarios from spec section 8.3**

- [ ] **Step 2: Document any issues found**

- [ ] **Step 3: Fix issues and re-test**

- [ ] **Step 4: Commit**

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-23-email-generation-implementation.md`. Please review the plan. Does it capture what you want?**

**For this plan I recommend Subagent-driven, because the tasks have strong sequential dependencies (models → repositories → schemas → endpoints → pipeline → worker → frontend), and a shipped mistake in the pipeline logic would require significant rework. Subagent-driven provides independent review at each task boundary.**
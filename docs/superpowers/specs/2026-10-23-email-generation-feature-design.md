# Email Generation Feature - Design Specification

## Overview

Implement a complete end-to-end feature for generating personalized job application emails from job descriptions. The feature integrates with the existing TryMyPost architecture using the same patterns for React frontend, FastAPI backend, LangChain orchestration, Tavily web search, and PostgreSQL database.

## Architecture Decisions

### 1. Data Model
- **New `UserProfile` table** - Stores user's personal information (name, phone, LinkedIn, GitHub) with 1:1 relationship to `AppSettings`
- **New `EmailGeneration` table** - Persists generated emails for history/analytics
- **Extend `AppSettings`** - Add new columns for Tavily configuration if needed

### 2. Pipeline Integration
- **New independent pipeline** - Separate `GenerationTask` type with dedicated worker logic (`run_email_generation_pipeline`)
- Follows existing patterns: RabbitMQ task queue, SSE progress updates, usage tracking

### 3. Persistence
- **Store generated emails** in `EmailGeneration` table for history

---

## 1. Database Schema

### 1.1 UserProfile Model
```python
class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(String(36), primary_key=True, index=True)
    app_settings_id = Column(String(36), ForeignKey("app_settings.id"), unique=True, nullable=False)
    
    # User personal data
    full_name = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    whatsapp = Column(String(50), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship
    app_settings = relationship("AppSettings", back_populates="user_profile")
```

### 1.2 EmailGeneration Model
```python
class EmailGeneration(Base):
    __tablename__ = "email_generations"
    
    id = Column(String(36), primary_key=True, index=True)
    task_id = Column(String(36), nullable=False, index=True)  # Links to GenerationTask
    
    # Input
    job_description = Column(Text, nullable=False)
    
    # Extracted job info
    job_title = Column(String(200), nullable=True)
    company_name = Column(String(200), nullable=True)
    recruiter_name = Column(String(200), nullable=True)
    recruiter_email = Column(String(200), nullable=True)
    key_requirements = Column(JSON, nullable=True)  # List of strings
    technologies = Column(JSON, nullable=True)
    experience_desired = Column(JSON, nullable=True)
    location_modality = Column(String(200), nullable=True)
    salary_info = Column(String(500), nullable=True)
    salary_expectation_required = Column(Boolean, default=False, nullable=False)
    
    # Generated output
    recipient_email = Column(String(200), nullable=True)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    
    # Metadata
    model_used = Column(String(100), nullable=True)
    tavily_searches_performed = Column(Integer, default=0, nullable=False)
    generation_time_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
```

### 1.3 AppSettings Extension
Add to existing `AppSettings` model:
```python
user_profile = relationship("UserProfile", back_populates="app_settings", uselist=False, cascade="all, delete-orphan")
```

### 1.4 Migration Strategy
- Create migration script for new tables
- Add `user_profile` relationship to `AppSettings`
- Handle SQLite/PostgreSQL compatibility

---

## 2. Backend - FastAPI

### 2.1 New Schemas (`app/schemas/email_generation.py`)

```python
# Request/Response models
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class GenerateEmailRequest(BaseModel):
    job_description: str = Field(..., min_length=50, max_length=10000)

class ExtractedJobInfo(BaseModel):
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    key_requirements: List[str] = []
    technologies: List[str] = []
    experience_desired: List[str] = []
    location_modality: Optional[str] = None
    salary_info: Optional[str] = None
    salary_expectation_required: bool = False

class GenerateEmailResponse(BaseModel):
    task_id: str
    status: str

class EmailGenerationResult(BaseModel):
    recipient_email: Optional[str] = None
    subject: str
    body: str
    extracted_info: ExtractedJobInfo

class EmailGenerationHistoryItem(BaseModel):
    id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    recipient_email: Optional[str] = None
    subject: str
    created_at: datetime

class EmailGenerationHistoryResponse(BaseModel):
    items: List[EmailGenerationHistoryItem]
    total: int
    page: int
    page_size: int
```

### 2.2 New Repository (`app/repositories/user_profile_repository.py`)
```python
class UserProfileRepository:
    @staticmethod
    async def get_by_app_settings_id(db: AsyncSession, app_settings_id: str) -> Optional[UserProfile]
    @staticmethod
    async def create(db: AsyncSession, app_settings_id: str) -> UserProfile
    @staticmethod
    async def update(db: AsyncSession, profile: UserProfile, data: UserProfileUpdate) -> UserProfile
    @staticmethod
    async def get_or_create(db: AsyncSession, app_settings_id: str) -> UserProfile
```

### 2.3 New Repository (`app/repositories/email_generation_repository.py`)
```python
class EmailGenerationRepository:
    @staticmethod
    async def create(db: AsyncSession, data: dict) -> EmailGeneration
    @staticmethod
    async def get_by_task_id(db: AsyncSession, task_id: str) -> Optional[EmailGeneration]
    @staticmethod
    async def list_history(db: AsyncSession, page: int, page_size: int, search: Optional[str] = None) -> Tuple[List[EmailGeneration], int]
```

### 2.4 New Router Endpoints (`app/api/routes.py` additions)

```python
# User Profile
@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(db: AsyncSession = Depends(get_db))

@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(request: UserProfileUpdate, db: AsyncSession = Depends(get_db))

# Email Generation
@router.post("/emails/generate", response_model=GenerateEmailResponse)
async def generate_email(request: GenerateEmailRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db))

@router.get("/emails/generate/{task_id}", response_model=TaskStatusResponse)
async def get_email_generation_status(task_id: str, db: AsyncSession = Depends(get_db))

@router.get("/emails/generate/{task_id}/events")
async def email_generation_events(task_id: str, request: Request)

@router.post("/emails/generate/{task_id}/cancel")
async def cancel_email_generation(task_id: str, db: AsyncSession = Depends(get_db))

# History
@router.get("/emails/history", response_model=EmailGenerationHistoryResponse)
async def list_email_history(page: int = 1, page_size: int = 10, search: Optional[str] = None, db: AsyncSession = Depends(get_db))

@router.get("/emails/history/{email_id}", response_model=EmailGenerationResult)
async def get_email_detail(email_id: str, db: AsyncSession = Depends(get_db))

@router.delete("/emails/history/{email_id}")
async def delete_email_history(email_id: str, db: AsyncSession = Depends(get_db))
```

### 2.5 Pipeline Service (`app/services/email_pipeline_service.py`)

New service with `run_email_generation_pipeline(task_id: str, input_data: Dict[str, Any])` following the same pattern as `run_generation_pipeline`:
- Creates `GenerationTask` with status tracking
- Uses SSE for progress updates
- Tracks token usage via `UsageTracker`
- Stores result in `EmailGeneration` table
- Publishes to RabbitMQ queue `email_generation_tasks`

---

## 3. LangChain Integration

### 3.1 New Prompts (`app/prompts/`)

#### `email_analyzer.yaml` - Extract structured info from job description
```yaml
_type: prompt
input_variables: ["job_description"]
template: |
  Analyze the following job description and extract structured information.
  Return ONLY valid JSON with these exact fields:
  {
    "job_title": "string or null",
    "company_name": "string or null", 
    "recruiter_name": "string or null",
    "recruiter_email": "string or null",
    "key_requirements": ["string"],
    "technologies": ["string"],
    "experience_desired": ["string"],
    "location_modality": "string or null",
    "salary_info": "string or null",
    "salary_expectation_required": boolean
  }
  
  RULES:
  - Only extract information EXPLICITLY present in the description
  - For recruiter_email: ONLY return if explicitly written (e.g., "email: x@y.com" or "contact: x@y.com")
  - NEVER infer or guess emails from names/domains
  - salary_expectation_required: true ONLY if text explicitly asks candidate to provide salary expectations
  - If salary range is OFFERED (not requested), salary_expectation_required = false
  - Return null for any field not found
  
  JOB DESCRIPTION:
  {job_description}
```

#### `email_tavily_researcher.yaml` - Research when info is missing
```yaml
_type: prompt
input_variables: ["job_description", "missing_fields", "extracted_info"]
template: |
  Research missing information about this job posting using web search.
  Focus on finding: {missing_fields}
  
  Current extracted info: {extracted_info}
  
  Original job description: {job_description}
  
  Search for:
  1. Original job posting page
  2. Company careers page
  3. Similar postings from same company
  4. Recruiter contact info (if name known)
  
  Return ONLY valid JSON with any newly found information:
  {
    "job_title": "string or null",
    "company_name": "string or null",
    "recruiter_name": "string or null", 
    "recruiter_email": "string or null",
    "salary_expectation_required": boolean or null
  }
  
  IMPORTANT: Only return recruiter_email if explicitly found on official sources.
  Never synthesize emails.
```

#### `email_generator.yaml` - Generate the application email
```yaml
_type: prompt
input_variables: ["job_description", "extracted_info", "user_profile", "salary_expectation_required"]
template: |
  Generate a personalized job application email in Portuguese (Brazil).
  
  JOB DESCRIPTION:
  {job_description}
  
  EXTRACTED JOB INFO:
  {extracted_info}
  
  USER PROFILE:
  Name: {user_profile.full_name}
  Phone/WhatsApp: {user_profile.phone_or_whatsapp}
  LinkedIn: {user_profile.linkedin_url}
  GitHub: {user_profile.github_url}
  
  SALARY EXPECTATION REQUIRED: {salary_expectation_required}
  
  RULES:
  1. Use the appropriate template based on salary_expectation_required
  2. Personalize the experience paragraph to match job requirements
  3. Use ONLY real user profile data - omit empty fields
  4. Never invent experiences, technologies, or skills
  5. Keep it natural, concise, and professional
  6. Output ONLY valid JSON:
  
  {{
    "recipient_email": "string or null",
    "subject": "string",
    "body": "string"
  }}
  
  TEMPLATE 1 - NO SALARY EXPECTATION:
  Subject: Candidatura: [Nome da vaga] - [Seu Nome Completo]
  Body:
  Olá, [Nome do Recrutador ou Time de Seleção], tudo bem?
  
  Vi a vaga para [Nome da vaga] no LinkedIn e me interessei bastante, pois o perfil alinha-se muito com o meu dia a dia.
  
  Tenho experiência com [experiências relevantes para a vaga]. Além disso, venho aplicando soluções de Inteligência Artificial em meus projetos e possuo inglês intermediário.
  
  Segue meu currículo em anexo para análise. Se fizer sentido para vocês, será um prazer bater um papo para apresentar melhor o meu trabalho!
  
  Atenciosamente,
  
  [Seu Nome]
  
  [Seu Telefone / WhatsApp] | [Seu LinkedIn] | [Seu GitHub]
  
  TEMPLATE 2 - WITH SALARY EXPECTATION:
  Subject: Candidatura: [Nome da vaga] - [Seu Nome Completo]
  Body:
  Olá, [Nome do Recrutador ou Time de Seleção], tudo bem?
  
  Vi a vaga para [Nome da vaga] no LinkedIn e me interessei bastante, pois o perfil alinha-se muito com o meu dia a dia.
  
  Tenho experiência com [experiências relevantes para a vaga]. Além disso, venho aplicando soluções de Inteligência Artificial em meus projetos e possuo inglês intermediário.
  
  Conforme solicitado, minha pretensão salarial atual está entre R$ 4.500,00 e R$ 5.500,00 (PJ), mas estou totalmente aberto a conversar sobre a proposta e modelo da empresa.
  
  Segue meu currículo em anexo. Se fizer sentido para vocês, será um prazer bater um papo para contar mais sobre minhas experiências!
  
  Atenciosamente,
  
  [Seu Nome]
  
  [Seu Telefone / WhatsApp] | [Seu LinkedIn] | [Seu GitHub]
```

### 3.2 Pipeline Steps (`app/services/email_pipeline_service.py`)

```python
async def run_email_generation_pipeline(task_id: str, input_data: Dict[str, Any]) -> None:
    """Complete email generation pipeline"""
    # Step 1: Analyze job description (extract structured info)
    # Step 2: Check if Tavily research needed (missing critical fields)
    # Step 3: If needed, run Tavily research
    # Step 4: Merge extracted + researched info
    # Step 5: Get user profile
    # Step 6: Generate email using appropriate template
    # Step 7: Validate and structure output
    # Step 8: Persist to EmailGeneration table
    # Step 9: Update GenerationTask with result
```

### 3.3 Tavily Integration
- Reuse existing `search_service.run_with_web_search` and `create_web_search_tool`
- Only invoke when critical fields are missing (recruiter_email, company_name, salary_expectation_required clarification)
- Limit to 3-5 searches max per generation

---

## 4. Frontend - React

### 4.1 New Types (`frontend/src/types/email.ts`)
```typescript
export interface UserProfile {
  id: string;
  full_name?: string;
  phone?: string;
  whatsapp?: string;
  linkedin_url?: string;
  github_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedJobInfo {
  job_title?: string;
  company_name?: string;
  recruiter_name?: string;
  recruiter_email?: string;
  key_requirements: string[];
  technologies: string[];
  experience_desired: string[];
  location_modality?: string;
  salary_info?: string;
  salary_expectation_required: boolean;
}

export interface EmailGenerationResult {
  recipient_email?: string;
  subject: string;
  body: string;
  extracted_info: ExtractedJobInfo;
}

export interface EmailGenerationHistoryItem {
  id: string;
  job_title?: string;
  company_name?: string;
  recipient_email?: string;
  subject: string;
  created_at: string;
}

export interface GenerateEmailRequest {
  job_description: string;
}

export interface GenerateEmailResponse {
  task_id: string;
  status: string;
}
```

### 4.2 New API Service (`frontend/src/services/emails.ts`)
```typescript
export const emailApi = {
  getProfile: () => api.get<UserProfile>('/profile'),
  updateProfile: (data: Partial<UserProfile>) => api.put<UserProfile>('/profile', data),
  generate: (data: GenerateEmailRequest) => api.post<GenerateEmailResponse>('/emails/generate', data),
  getStatus: (taskId: string) => api.get<TaskStatusResponse>(`/emails/generate/${taskId}`),
  cancel: (taskId: string) => api.post(`/emails/generate/${taskId}/cancel`),
  listHistory: (params?: { page?: number; page_size?: number; search?: string }) => 
    api.get<EmailGenerationHistoryResponse>('/emails/history', params),
  getDetail: (id: string) => api.get<EmailGenerationResult>(`/emails/history/${id}`),
  delete: (id: string) => api.delete(`/emails/history/${id}`),
};
```

### 4.3 New Store (`frontend/src/store/emailStore.ts`)
```typescript
interface EmailGenerationState {
  currentTaskId: string | null;
  currentStep: string;
  progress: number;
  isGenerating: boolean;
  result: EmailGenerationResult | null;
  draftDescription: string;
  
  setGeneration: (taskId: string) => void;
  setResult: (result: EmailGenerationResult | null) => void;
  clearGeneration: () => void;
  updateProgress: (step: string, progress: number) => void;
  setDraftDescription: (desc: string) => void;
}
```

### 4.4 New Pages

#### `EmailGenerationPage.tsx` (main page - follows PlaygroundPage pattern)
- Textarea for job description
- Generate button
- Loading overlay with SSE progress (reuses `GenerationLoadingOverlay`)
- Navigation to results page on completion

#### `EmailGenerationResultsPage.tsx` (results page)
- Display recipient email (with "Not found" state)
- Subject line (copyable)
- Email body (copyable)
- Extracted job info panel
- Action buttons: Copy email, Copy subject, Copy body, Copy all
- Back to generate new

#### `ProfileSettingsSection` (in Settings page)
- Add new section for user profile fields
- Full name, Phone/WhatsApp, LinkedIn, GitHub
- Integrated into existing SettingsPage

### 4.5 Components
- `EmailGenerationForm.tsx` - Form with textarea and validation
- `EmailResultCard.tsx` - Display generated email with copy actions
- `ExtractedInfoPanel.tsx` - Show extracted job information
- `CopyButton.tsx` - Reusable copy-to-clipboard with toast feedback

### 4.6 Routing
Add to `routes.tsx`:
```tsx
<Route path="/email-generation" element={<EmailGenerationPage />} />
<Route path="/email-generation/results" element={<EmailGenerationResultsPage />} />
<Route path="/email-generation/history" element={<EmailHistoryPage />} />
```

### 4.7 Sidebar Navigation
Add to `mainNavigation` in `Sidebar.tsx`:
```tsx
{ key: 'emailGeneration', href: '/email-generation', icon: Mail },
```
Add `Mail` icon from `lucide-react`.

### 4.8 i18n
Add translations for:
- Sidebar: "Email de Candidatura"
- Page titles, labels, placeholders
- Toast messages
- Copy button states
- Loading states

---

## 5. Worker Integration

### 5.1 New Queue Consumer
- Add `email_generation_tasks` queue in RabbitMQ
- Worker processes messages by calling `run_email_generation_pipeline`
- Follows same pattern as existing worker in `worker.py`

### 5.2 Task Events
- Reuse existing `task_events` system for SSE progress updates
- Same `TASK_EVENTS_CHANNEL` for notifications

---

## 6. Configuration & Environment

### 6.1 Environment Variables
No new env vars required - uses existing:
- `TAVILY_API_KEY` (already in settings)
- `DATABASE_URL`
- `RABBITMQ_URL`
- AI provider keys (GOOGLE_API_KEY, etc.)

### 6.2 Settings
User profile fields stored in database, not env vars.

---

## 7. Error Handling

### 7.1 Backend
- Validation errors (422) for empty/invalid job description
- Tavily errors: graceful fallback to extracted info only
- LLM errors: proper error messages via existing rate limit handling
- Missing user profile: return clear error prompting user to configure profile

### 7.2 Frontend
- Form validation (min 50 chars for job description)
- Loading states with progress
- Error toasts with user-friendly messages
- Empty state for missing recipient_email

---

## 8. Testing Strategy

### 8.1 Unit Tests
- `test_email_analyzer_prompt.py` - Prompt output parsing
- `test_email_generator_prompt.py` - Template selection logic
- `test_user_profile_repository.py` - CRUD operations
- `test_email_generation_repository.py` - History queries

### 8.2 Integration Tests
- `test_email_generation_api.py` - Full API flow
- `test_email_pipeline.py` - Pipeline with mocked LLM/Tavily
- `test_profile_settings.py` - Settings page integration

### 8.3 E2E Test Scenarios
1. Generate email without salary expectation
2. Generate email with salary expectation required
3. Job description with salary range offered (not required)
4. Ambiguous salary - Tavily research triggered
5. Recruiter email found in description
6. Recruiter email not found (null returned)
7. User profile partially filled
8. User profile empty
9. Tavily API error handling
10. LLM rate limit handling

---

## 9. Implementation Phases

### Phase 1: Database & Backend Core
1. Create migration for `UserProfile` and `EmailGeneration` tables
2. Add repositories
3. Add schemas
4. Add router endpoints (profile + email generation)
5. Basic pipeline structure

### Phase 2: LangChain Pipeline
1. Create 3 prompt files
2. Implement pipeline steps in `email_pipeline_service.py`
3. Integrate Tavily research logic
4. Add structured output parsing/validation

### Phase 3: Worker & Queue
1. Add queue consumer for `email_generation_tasks`
2. Register in worker startup

### Phase 4: Frontend - Core Feature
1. Types and API service
2. Email generation store
3. EmailGenerationPage (form + loading)
4. EmailGenerationResultsPage (display + copy)
5. Routing and sidebar navigation

### Phase 5: Frontend - Settings Integration
1. Add profile section to SettingsPage
2. Profile API integration
3. Form validation and save

### Phase 6: History & Polish
1. Email history page
2. i18n translations
3. Copy actions with toast feedback
4. Error states and edge cases

### Phase 7: Testing
1. Unit tests
2. Integration tests
3. E2E verification

---

## 10. Success Criteria

- [ ] User can configure profile in Settings
- [ ] User can paste job description and generate email
- [ ] Progress shown via SSE during generation
- [ ] Tavily research triggered only when needed
- [ ] Correct template selected based on salary expectation detection
- [ ] Recruiter email extracted only when explicitly present
- [ ] Generated email uses real user profile data
- [ ] No invented experiences/technologies
- [ ] History persisted and viewable
- [ ] Copy actions work for email, subject, body
- [ ] All existing patterns followed (no parallel architecture)
- [ ] Tests pass

---

## 11. Files to Create/Modify

### New Files:
- `backend/app/models/user_profile.py`
- `backend/app/models/email_generation.py`
- `backend/app/schemas/email_generation.py`
- `backend/app/repositories/user_profile_repository.py`
- `backend/app/repositories/email_generation_repository.py`
- `backend/app/services/email_pipeline_service.py`
- `backend/app/prompts/email_analyzer.yaml`
- `backend/app/prompts/email_tavily_researcher.yaml`
- `backend/app/prompts/email_generator.yaml`
- `backend/scripts/migrate_add_email_generation.py` (or use alembic)
- `frontend/src/types/email.ts`
- `frontend/src/services/emails.ts`
- `frontend/src/store/emailStore.ts`
- `frontend/src/features/email-generation/pages/EmailGenerationPage.tsx`
- `frontend/src/features/email-generation/pages/EmailGenerationResultsPage.tsx`
- `frontend/src/features/email-generation/pages/EmailHistoryPage.tsx`
- `frontend/src/features/email-generation/components/EmailGenerationForm.tsx`
- `frontend/src/features/email-generation/components/EmailResultCard.tsx`
- `frontend/src/features/email-generation/components/ExtractedInfoPanel.tsx`
- `frontend/src/features/email-generation/components/CopyButton.tsx`
- `frontend/src/features/email-generation/i18n.ts`

### Modified Files:
- `backend/app/models/app_settings.py` - Add relationship
- `backend/app/models/__init__.py` - Export new models
- `backend/app/schemas/__init__.py` - Export new schemas
- `backend/app/repositories/__init__.py` - Export new repositories
- `backend/app/services/__init__.py` - Export new service
- `backend/app/api/routes.py` - Add new endpoints
- `backend/worker.py` - Add email pipeline import and queue consumer
- `backend/app/db/session.py` - Add migration for new tables
- `frontend/src/types/index.ts` - Export new types
- `frontend/src/services/posts.ts` - Add emailApi export
- `frontend/src/store/index.ts` - Add email store export
- `frontend/src/app/routes.tsx` - Add new routes
- `frontend/src/components/layout/Sidebar.tsx` - Add navigation item
- `frontend/src/features/settings/pages/SettingsPage.tsx` - Add profile section
- `frontend/src/i18n/index.ts` - Import email i18n
- `frontend/src/i18n/layout.ts` - Add sidebar translation

---

## 12. Security Considerations

- API keys never exposed to frontend
- Tavily searches only from backend
- User profile data only accessible to authenticated user (when auth added)
- Email content not logged in plain text
- Input validation on job description length
- Rate limiting via existing RabbitMQ prefetch

---

## 13. Future Enhancements (Out of Scope)

- Multiple email templates/styles
- Attachment handling simulation
- A/B testing of email variations
- Integration with email clients
- Analytics dashboard for application success rates
- Multi-language support beyond Portuguese
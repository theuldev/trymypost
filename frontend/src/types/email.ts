export interface UserProfile {
  id: string;
  full_name?: string;
  phone?: string;
  whatsapp?: string;
  linkedin_url?: string;
  github_url?: string;
  experience_summary?: string;
  salary_expectation?: string;
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
  email_id?: string;
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

export interface EmailGenerationHistoryResponse {
  items: EmailGenerationHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}
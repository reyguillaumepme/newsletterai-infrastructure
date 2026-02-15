
export type Status = 'draft' | 'scheduled' | 'sent';
export type SourceType = 'youtube' | 'blog' | 'description';
export type ContactStatus = 'subscribed' | 'unsubscribed' | 'bounced';

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  last_login?: string;
  role?: string;
  brevo_api_key?: string;
  sender_name?: string;
  sender_email?: string;
  subscription_plan?: 'free' | 'pro' | 'elite';
  credits?: number;
}

export interface StrategyCTA {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
}

export interface StructuredStrategy {
  tone: string;
  frequency: string;
  pillars: { title: string; description: string }[];
}

export interface Brand {
  id: string;
  user_id?: string;
  brand_name: string;
  description: string;
  target_audience: string;
  editorial_tone: string;
  logo_url?: string;
  desired_perception?: string;
  skills_strengths?: string;
  values_beliefs?: string;
  differentiation?: string;
  career_story?: string;
  achievements?: string;
  inspirations?: string;
  daily_life?: string;
  word_limit?: string;
  emojis_allowed?: boolean;
  cta_required?: boolean;
  cta_url?: string;
  cta_config?: string; // Stockage des CTAs manuels (JSON string)
  topics_to_avoid?: string;
  reference_content?: string;
  newsletter_strategy?: string; // Stocké sous forme de JSON stringifié (tone, frequency, pillars)
  writing_framework?: string;
  sender_name?: string;
  sender_email?: string;
  footer_template?: string; // Template HTML du footer par défaut pour cette marque
  brevo_list_id?: number; // ID de la liste Brevo associée
  brevo_sender_id?: number; // ID du sender Brevo associé
  slug?: string; // URL unique pour la page d'inscription
  subscription_settings?: {
    title: string;
    subtitle: string;
    button_text: string;
    primary_color: string;
    logo_visible: boolean;
  }; // Configuration JSON de la page d'inscription
}

export interface Contact {
  id: string;
  brand_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: ContactStatus;
  brevo_id?: number;
  attributes?: Record<string, any>;
  created_at: string;
}

export interface Newsletter {
  id: string;
  user_id?: string;
  brand_id: string;
  subject: string;
  status: Status;
  scheduled_at?: string;
  created_at: string;
  generated_content?: string;
  footer_content?: string;
  show_footer_logo?: boolean;
  show_ai_transparency?: boolean;
  brevo_campaign_id?: number;
  content?: string; // Full HTML content for audit/send
  brands?: { brand_name: string; logo_url?: string }; // Embedded brand data from join
}

export interface Idea {
  id: string;
  user_id?: string;
  brand_id: string;
  newsletter_id?: string | null;
  title: string;
  content: string;
  image_url?: string;
  image_prompt?: string;
  source: string;
  source_type: SourceType;
  used: boolean;
  order_index?: number;
  created_at?: string;
}

export interface Statistics {
  id: string;
  user_id?: string;
  newsletter_id: string;
  opens: number;
  clicks: number;
  sent_count: number;
  date: string;
  subject?: string;
  image_url?: string;
  brand_id?: string;
  brand_logo?: string;
  brand_name?: string;
}

export type ComplianceCheckStatus = 'success' | 'warning' | 'error';

export interface ComplianceCheckResult {
  mentions: { status: ComplianceCheckStatus; message: string };
  unsubscribe: { status: ComplianceCheckStatus; message: string };
  ai_marker: { status: ComplianceCheckStatus; message: string };
  spam_score: { score: number; status: ComplianceCheckStatus; message: string; details?: string[]; spam_checks?: { label: string; passed: boolean; penalty: number; category: string; remediation?: string }[] };
  overall_status: ComplianceCheckStatus;
}

export interface ComplianceLog {
  id: string;
  brand_id: string;
  newsletter_id: string;
  sent_at: string;
  recipient_count: number;
  subject: string;
  compliance_snapshot: string; // JSON string of ComplianceCheckResult
}

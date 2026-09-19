/**
 * Database types for the Growth OS Supabase project.
 *
 * Kept hand-written (rather than generated) so the JSON `content` column can be
 * typed as the real `TenantContent` shape instead of an opaque `Json`.
 * Regenerate-and-merge with:
 *   npx supabase gen types typescript --project-id <ref> --schema public
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** A single promotional banner shown above the hero. */
export interface TenantPromo {
  label?: string | null;
  text: string;
  href?: string | null;
}

/** One value-proposition card rendered under the hero. */
export interface TenantHighlight {
  title: string;
  description: string;
}

/**
 * The shape stored in `client_configs.content`.
 *
 * Every field is optional: configs are edited by an AI agent and approved by a
 * human, so the renderer must survive a partial or half-migrated document.
 * `TENANT_CONTENT_FALLBACK` fills the gaps.
 */
export interface TenantContent {
  locale?: string | null;
  direction?: "ltr" | "rtl" | null;
  hero_headline?: string | null;
  hero_subheadline?: string | null;
  cta_text?: string | null;
  cta_href?: string | null;
  active_promo?: TenantPromo | null;
  highlights?: TenantHighlight[] | null;
}

export type PendingChangeStatus = "pending" | "approved" | "rejected" | "applied";

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          domain: string;
          business_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          business_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          business_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      client_configs: {
        Row: {
          id: string;
          client_id: string;
          version: number;
          content: TenantContent;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          version?: number;
          content?: TenantContent;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          version?: number;
          content?: TenantContent;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_configs_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_changes: {
        Row: {
          id: string;
          client_id: string;
          suggested_changes: TenantContent;
          reasoning: string | null;
          status: PendingChangeStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          suggested_changes: TenantContent;
          reasoning?: string | null;
          status?: PendingChangeStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          suggested_changes?: TenantContent;
          reasoning?: string | null;
          status?: PendingChangeStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_changes_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      publish_client_config: {
        Args: {
          p_client_id: string;
          p_content: TenantContent;
          p_pending_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["client_configs"]["Row"];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientConfig = Database["public"]["Tables"]["client_configs"]["Row"];
export type PendingChange = Database["public"]["Tables"]["pending_changes"]["Row"];

/**
 * `TenantContent` after validation and fallback merging: every field the
 * renderer reads is guaranteed present, so components never branch on
 * undefined.
 */
export interface ResolvedTenantContent {
  locale: string;
  direction: "ltr" | "rtl";
  hero_headline: string;
  hero_subheadline: string;
  cta_text: string;
  cta_href: string | null;
  active_promo: TenantPromo | null;
  highlights: TenantHighlight[];
}

/** A tenant plus its currently active config, as rendered by the site. */
export interface Tenant {
  client: Client;
  config: ClientConfig | null;
  content: ResolvedTenantContent;
}

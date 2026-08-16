export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      beschluss_historie: {
        Row: {
          aktion: string
          beschluss_id: string
          durchgefuehrt_am: string
          durchgefuehrt_von: string | null
          id: string
          nach_status: string | null
          notizen: string | null
          von_status: string | null
          zusatz_daten: Json | null
        }
        Insert: {
          aktion: string
          beschluss_id: string
          durchgefuehrt_am?: string
          durchgefuehrt_von?: string | null
          id?: string
          nach_status?: string | null
          notizen?: string | null
          von_status?: string | null
          zusatz_daten?: Json | null
        }
        Update: {
          aktion?: string
          beschluss_id?: string
          durchgefuehrt_am?: string
          durchgefuehrt_von?: string | null
          id?: string
          nach_status?: string | null
          notizen?: string | null
          von_status?: string | null
          zusatz_daten?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "beschluss_historie_beschluss_id_fkey"
            columns: ["beschluss_id"]
            isOneToOne: false
            referencedRelation: "beschluss_register"
            referencedColumns: ["id"]
          },
        ]
      }
      beschluss_register: {
        Row: {
          abstimmung_enthaltung: number | null
          abstimmung_ja: number | null
          abstimmung_nein: number | null
          aufgehoben_am: string | null
          aufgehoben_durch_id: string | null
          aufhebung_notiz: string | null
          beschluss_nummer: string
          beschreibung: string | null
          bestaetigt_in_sitzung_am: string | null
          betrag: number | null
          command_decision_id: string | null
          command_decision_item_id: string | null
          created_at: string
          erstellt_am: string
          erstellt_von: string | null
          genehmigt_am: string | null
          genehmigt_von: string | null
          gueltig_bis: string | null
          hebt_auf_id: string | null
          id: string
          ist_historisch: boolean | null
          jahr: number
          meeting_decision_id: string | null
          meeting_id: string | null
          order_id: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          status: string
          titel: string
          typ: string
          updated_at: string
        }
        Insert: {
          abstimmung_enthaltung?: number | null
          abstimmung_ja?: number | null
          abstimmung_nein?: number | null
          aufgehoben_am?: string | null
          aufgehoben_durch_id?: string | null
          aufhebung_notiz?: string | null
          beschluss_nummer: string
          beschreibung?: string | null
          bestaetigt_in_sitzung_am?: string | null
          betrag?: number | null
          command_decision_id?: string | null
          command_decision_item_id?: string | null
          created_at?: string
          erstellt_am?: string
          erstellt_von?: string | null
          genehmigt_am?: string | null
          genehmigt_von?: string | null
          gueltig_bis?: string | null
          hebt_auf_id?: string | null
          id?: string
          ist_historisch?: boolean | null
          jahr?: number
          meeting_decision_id?: string | null
          meeting_id?: string | null
          order_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          status?: string
          titel: string
          typ: string
          updated_at?: string
        }
        Update: {
          abstimmung_enthaltung?: number | null
          abstimmung_ja?: number | null
          abstimmung_nein?: number | null
          aufgehoben_am?: string | null
          aufgehoben_durch_id?: string | null
          aufhebung_notiz?: string | null
          beschluss_nummer?: string
          beschreibung?: string | null
          bestaetigt_in_sitzung_am?: string | null
          betrag?: number | null
          command_decision_id?: string | null
          command_decision_item_id?: string | null
          created_at?: string
          erstellt_am?: string
          erstellt_von?: string | null
          genehmigt_am?: string | null
          genehmigt_von?: string | null
          gueltig_bis?: string | null
          hebt_auf_id?: string | null
          id?: string
          ist_historisch?: boolean | null
          jahr?: number
          meeting_decision_id?: string | null
          meeting_id?: string | null
          order_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          status?: string
          titel?: string
          typ?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beschluss_register_aufgehoben_durch_id_fkey"
            columns: ["aufgehoben_durch_id"]
            isOneToOne: false
            referencedRelation: "beschluss_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_command_decision_id_fkey"
            columns: ["command_decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_command_decision_item_id_fkey"
            columns: ["command_decision_item_id"]
            isOneToOne: false
            referencedRelation: "command_decision_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_hebt_auf_id_fkey"
            columns: ["hebt_auf_id"]
            isOneToOne: false
            referencedRelation: "beschluss_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_meeting_decision_id_fkey"
            columns: ["meeting_decision_id"]
            isOneToOne: false
            referencedRelation: "meeting_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beschluss_register_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_item_vote_history: {
        Row: {
          changed_at: string
          id: string
          item_id: string
          new_reason: string | null
          new_vote: string
          old_reason: string | null
          old_vote: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          item_id: string
          new_reason?: string | null
          new_vote: string
          old_reason?: string | null
          old_vote?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          item_id?: string
          new_reason?: string | null
          new_vote?: string
          old_reason?: string | null
          old_vote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_item_vote_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "command_decision_items"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_item_votes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          reason: string | null
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          reason?: string | null
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          reason?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_item_votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "command_decision_items"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_item_votes_missing: {
        Row: {
          id: string
          item_id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_item_votes_missing_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "command_decision_items"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_items: {
        Row: {
          created_at: string
          decision_id: string
          description: string
          id: string
          item_number: number
          meeting_confirmed_at: string | null
          meeting_confirmed_in: string | null
          status: string
          updated_at: string
          voting_closed_at: string | null
          voting_closed_by: string | null
          voting_opened_at: string | null
          voting_override_at: string | null
          voting_override_by: string | null
          voting_override_reason: string | null
          voting_result: string | null
          voting_status: string | null
        }
        Insert: {
          created_at?: string
          decision_id: string
          description: string
          id?: string
          item_number?: number
          meeting_confirmed_at?: string | null
          meeting_confirmed_in?: string | null
          status?: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_opened_at?: string | null
          voting_override_at?: string | null
          voting_override_by?: string | null
          voting_override_reason?: string | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Update: {
          created_at?: string
          decision_id?: string
          description?: string
          id?: string
          item_number?: number
          meeting_confirmed_at?: string | null
          meeting_confirmed_in?: string | null
          status?: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_opened_at?: string | null
          voting_override_at?: string | null
          voting_override_by?: string | null
          voting_override_reason?: string | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_items_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_decision_items_meeting_confirmed_in_fkey"
            columns: ["meeting_confirmed_in"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_vote_history: {
        Row: {
          changed_at: string
          decision_id: string
          id: string
          new_reason: string | null
          new_vote: string
          old_reason: string | null
          old_vote: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          decision_id: string
          id?: string
          new_reason?: string | null
          new_vote: string
          old_reason?: string | null
          old_vote?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          decision_id?: string
          id?: string
          new_reason?: string | null
          new_vote?: string
          old_reason?: string | null
          old_vote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_vote_history_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_votes: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          reason: string | null
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          reason?: string | null
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          reason?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decision_votes_missing: {
        Row: {
          decision_id: string
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          decision_id: string
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          decision_id?: string
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_decision_votes_missing_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "command_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      command_decisions: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          created_by: string
          description: string | null
          email_status: string | null
          id: string
          reference_number: string
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
          voting_closed_at: string | null
          voting_closed_by: string | null
          voting_opened_at: string | null
          voting_override_at: string | null
          voting_override_by: string | null
          voting_override_reason: string | null
          voting_result: string | null
          voting_status: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email_status?: string | null
          id?: string
          reference_number: string
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_opened_at?: string | null
          voting_override_at?: string | null
          voting_override_by?: string | null
          voting_override_reason?: string | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email_status?: string | null
          id?: string
          reference_number?: string
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_opened_at?: string | null
          voting_override_at?: string | null
          voting_override_by?: string | null
          voting_override_reason?: string | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          conversation_key: string
          created_at: string
          created_by: string
          id: string
          is_closed: boolean | null
          subject: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          conversation_key: string
          created_at?: string
          created_by: string
          id?: string
          is_closed?: boolean | null
          subject?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          conversation_key?: string
          created_at?: string
          created_by?: string
          id?: string
          is_closed?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      event_form_templates: {
        Row: {
          adjustment: string
          adjustment_note: string | null
          categories: Json | null
          created_at: string
          created_by: string
          date_time: string
          description: string | null
          event_name: string
          id: string
          location: string
          name: string
          registration_deadline: string
          updated_at: string
          vehicles: string | null
        }
        Insert: {
          adjustment: string
          adjustment_note?: string | null
          categories?: Json | null
          created_at?: string
          created_by: string
          date_time: string
          description?: string | null
          event_name: string
          id?: string
          location: string
          name: string
          registration_deadline: string
          updated_at?: string
          vehicles?: string | null
        }
        Update: {
          adjustment?: string
          adjustment_note?: string | null
          categories?: Json | null
          created_at?: string
          created_by?: string
          date_time?: string
          description?: string | null
          event_name?: string
          id?: string
          location?: string
          name?: string
          registration_deadline?: string
          updated_at?: string
          vehicles?: string | null
        }
        Relationships: []
      }
      event_participation_amount_history: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_reason: string | null
          changed_at: string
          changed_by: string
          event_participation_id: string
          id: string
          new_amount: number
          notification_sent: boolean | null
          notification_sent_at: string | null
          original_amount: number
          requires_approval: boolean | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          event_participation_id: string
          id?: string
          new_amount: number
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          original_amount: number
          requires_approval?: boolean | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          event_participation_id?: string
          id?: string
          new_amount?: number
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          original_amount?: number
          requires_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participation_amount_history_event_participation_id_fkey"
            columns: ["event_participation_id"]
            isOneToOne: false
            referencedRelation: "event_participations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participations: {
        Row: {
          amount_change_reason: string | null
          amount_confirmed: boolean | null
          amount_confirmed_at: string | null
          amount_confirmed_by: string | null
          approved_at: string | null
          approved_by: string | null
          attachment_name: string | null
          attachment_url: string | null
          confirmed_amount: number | null
          created_at: string
          created_by: string
          description: string | null
          email_status: string | null
          estimated_costs: number
          event_date: string
          event_location: string | null
          event_name: string
          id: string
          max_participants: number
          notes: string | null
          organizer: string | null
          organizer_bank_name: string | null
          organizer_iban: string | null
          overnight_required: boolean | null
          payment_details_accepted: boolean | null
          payment_method: string | null
          reapproved_at: string | null
          reapproved_by: string | null
          reference_number: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_reapproval: boolean | null
          status: string
          submitted_at: string | null
          transport_type: string | null
          updated_at: string
        }
        Insert: {
          amount_change_reason?: string | null
          amount_confirmed?: boolean | null
          amount_confirmed_at?: string | null
          amount_confirmed_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          confirmed_amount?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          email_status?: string | null
          estimated_costs?: number
          event_date: string
          event_location?: string | null
          event_name: string
          id?: string
          max_participants?: number
          notes?: string | null
          organizer?: string | null
          organizer_bank_name?: string | null
          organizer_iban?: string | null
          overnight_required?: boolean | null
          payment_details_accepted?: boolean | null
          payment_method?: string | null
          reapproved_at?: string | null
          reapproved_by?: string | null
          reference_number: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_reapproval?: boolean | null
          status?: string
          submitted_at?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Update: {
          amount_change_reason?: string | null
          amount_confirmed?: boolean | null
          amount_confirmed_at?: string | null
          amount_confirmed_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          confirmed_amount?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          email_status?: string | null
          estimated_costs?: number
          event_date?: string
          event_location?: string | null
          event_name?: string
          id?: string
          max_participants?: number
          notes?: string | null
          organizer?: string | null
          organizer_bank_name?: string | null
          organizer_iban?: string | null
          overnight_required?: boolean | null
          payment_details_accepted?: boolean | null
          payment_method?: string | null
          reapproved_at?: string | null
          reapproved_by?: string | null
          reference_number?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_reapproval?: boolean | null
          status?: string
          submitted_at?: string | null
          transport_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
      }
      expense_report_items: {
        Row: {
          amount: number
          category_custom: string | null
          category_id: string | null
          created_at: string
          description: string
          expense_report_id: string
          id: string
          position_number: number
        }
        Insert: {
          amount?: number
          category_custom?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          expense_report_id: string
          id?: string
          position_number: number
        }
        Update: {
          amount?: number
          category_custom?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          expense_report_id?: string
          id?: string
          position_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_report_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_report_items_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_report_payment_orders: {
        Row: {
          amount: number
          created_at: string
          expense_report_id: string
          id: string
          payment_order_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expense_report_id: string
          id?: string
          payment_order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_report_id?: string
          id?: string
          payment_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_report_payment_orders_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_report_payment_orders_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          advance_amount: number
          balance_amount: number
          created_at: string
          created_by: string
          event_date_from: string
          event_date_to: string | null
          event_name: string
          id: string
          notes: string | null
          participants: string | null
          payment_order_id: string | null
          reference_number: string
          responsible_person: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          balance_amount?: number
          created_at?: string
          created_by: string
          event_date_from: string
          event_date_to?: string | null
          event_name: string
          id?: string
          notes?: string | null
          participants?: string | null
          payment_order_id?: string | null
          reference_number: string
          responsible_person: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          balance_amount?: number
          created_at?: string
          created_by?: string
          event_date_from?: string
          event_date_to?: string | null
          event_name?: string
          id?: string
          notes?: string | null
          participants?: string | null
          payment_order_id?: string | null
          reference_number?: string
          responsible_person?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      idea_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      idea_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_image_votes: {
        Row: {
          created_at: string
          id: string
          image_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_image_votes_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "idea_images"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_images: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          image_url: string
          sort_order: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          image_url: string
          sort_order?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          image_url?: string
          sort_order?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_images_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "idea_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_polls: {
        Row: {
          created_at: string
          created_by: string
          id: string
          idea_id: string
          options: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          idea_id: string
          options?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          idea_id?: string
          options?: Json
        }
        Relationships: [
          {
            foreignKeyName: "idea_polls_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_reads: {
        Row: {
          id: string
          idea_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          idea_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          idea_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_reads_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_vote_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          idea_id: string
          new_vote: string | null
          previous_vote: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          idea_id: string
          new_vote?: string | null
          previous_vote?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          idea_id?: string
          new_vote?: string | null
          previous_vote?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_vote_logs_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_votes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          category: string
          created_at: string
          created_by: string
          deadline_notification_sent: boolean | null
          description: string | null
          id: string
          image_url: string | null
          status: string
          title: string
          updated_at: string
          voting_deadline: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          deadline_notification_sent?: boolean | null
          description?: string | null
          id?: string
          image_url?: string | null
          status?: string
          title: string
          updated_at?: string
          voting_deadline?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          deadline_notification_sent?: boolean | null
          description?: string | null
          id?: string
          image_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          voting_deadline?: string | null
        }
        Relationships: []
      }
      meeting_agenda_items: {
        Row: {
          category: string | null
          created_at: string
          decision_required: boolean | null
          deferred_from_meeting_id: string | null
          deferred_reason: string | null
          deferred_to_meeting_id: string | null
          description: string | null
          discussion_notes: string | null
          id: string
          is_fixed_item: boolean
          is_mandatory: boolean
          meeting_id: string
          priority: string | null
          requires_decision: boolean | null
          sort_order: number
          status: Database["public"]["Enums"]["agenda_item_status"]
          submitted_by: string
          submitted_by_name: string | null
          title: string
          traffic_light: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          decision_required?: boolean | null
          deferred_from_meeting_id?: string | null
          deferred_reason?: string | null
          deferred_to_meeting_id?: string | null
          description?: string | null
          discussion_notes?: string | null
          id?: string
          is_fixed_item?: boolean
          is_mandatory?: boolean
          meeting_id: string
          priority?: string | null
          requires_decision?: boolean | null
          sort_order?: number
          status?: Database["public"]["Enums"]["agenda_item_status"]
          submitted_by: string
          submitted_by_name?: string | null
          title: string
          traffic_light?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          decision_required?: boolean | null
          deferred_from_meeting_id?: string | null
          deferred_reason?: string | null
          deferred_to_meeting_id?: string | null
          description?: string | null
          discussion_notes?: string | null
          id?: string
          is_fixed_item?: boolean
          is_mandatory?: boolean
          meeting_id?: string
          priority?: string | null
          requires_decision?: boolean | null
          sort_order?: number
          status?: Database["public"]["Enums"]["agenda_item_status"]
          submitted_by?: string
          submitted_by_name?: string | null
          title?: string
          traffic_light?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_deferred_from_meeting_id_fkey"
            columns: ["deferred_from_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_deferred_to_meeting_id_fkey"
            columns: ["deferred_to_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          function_name: string | null
          id: string
          is_voting_member: boolean
          meeting_id: string
          notes: string | null
          profile_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          substitute_for: string | null
          updated_at: string
        }
        Insert: {
          function_name?: string | null
          id?: string
          is_voting_member?: boolean
          meeting_id: string
          notes?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          substitute_for?: string | null
          updated_at?: string
        }
        Update: {
          function_name?: string | null
          id?: string
          is_voting_member?: boolean
          meeting_id?: string
          notes?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          substitute_for?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_substitute_for_fkey"
            columns: ["substitute_for"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decision_votes: {
        Row: {
          decision_id: string
          id: string
          profile_id: string
          vote: string
          voted_at: string
        }
        Insert: {
          decision_id: string
          id?: string
          profile_id: string
          vote: string
          voted_at?: string
        }
        Update: {
          decision_id?: string
          id?: string
          profile_id?: string
          vote?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decision_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "meeting_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decision_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          command_decision_item_id: string | null
          created_at: string
          decided_at: string
          decision_number: string | null
          decision_text: string
          gueltig_bis: string | null
          hebt_auf_id: string | null
          id: string
          is_in_register: boolean | null
          meeting_id: string
          order_id: string | null
          recused_members: string[] | null
          register_added_at: string | null
          result: string | null
          source: string | null
          votes_abstain: number
          votes_against: number
          votes_for: number
        }
        Insert: {
          command_decision_item_id?: string | null
          created_at?: string
          decided_at?: string
          decision_number?: string | null
          decision_text: string
          gueltig_bis?: string | null
          hebt_auf_id?: string | null
          id?: string
          is_in_register?: boolean | null
          meeting_id: string
          order_id?: string | null
          recused_members?: string[] | null
          register_added_at?: string | null
          result?: string | null
          source?: string | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
        }
        Update: {
          command_decision_item_id?: string | null
          created_at?: string
          decided_at?: string
          decision_number?: string | null
          decision_text?: string
          gueltig_bis?: string | null
          hebt_auf_id?: string | null
          id?: string
          is_in_register?: boolean | null
          meeting_id?: string
          order_id?: string | null
          recused_members?: string[] | null
          register_added_at?: string | null
          result?: string | null
          source?: string | null
          votes_abstain?: number
          votes_against?: number
          votes_for?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_command_decision_item_id_fkey"
            columns: ["command_decision_item_id"]
            isOneToOne: false
            referencedRelation: "command_decision_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_hebt_auf_id_fkey"
            columns: ["hebt_auf_id"]
            isOneToOne: false
            referencedRelation: "beschluss_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_fixed_agenda_items: {
        Row: {
          created_at: string
          id: string
          is_mandatory: boolean | null
          meeting_type: string | null
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory?: boolean | null
          meeting_type?: string | null
          sort_order: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory?: boolean | null
          meeting_type?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          entry_deadline_hours: number
          id: string
          is_quorate: boolean | null
          kdt_present: boolean | null
          location: string
          meeting_number: string
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_meeting_date: string | null
          next_meeting_location: string | null
          next_meeting_time: string | null
          protocol_generated_at: string | null
          protocol_sent_at: string | null
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string | null
          updated_at: string
          voting_members_present: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          entry_deadline_hours?: number
          id?: string
          is_quorate?: boolean | null
          kdt_present?: boolean | null
          location?: string
          meeting_number: string
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          next_meeting_time?: string | null
          protocol_generated_at?: string | null
          protocol_sent_at?: string | null
          scheduled_date: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          updated_at?: string
          voting_members_present?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          entry_deadline_hours?: number
          id?: string
          is_quorate?: boolean | null
          kdt_present?: boolean | null
          location?: string
          meeting_number?: string
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          next_meeting_time?: string | null
          protocol_generated_at?: string | null
          protocol_sent_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          updated_at?: string
          voting_members_present?: number | null
        }
        Relationships: []
      }
      min_order_value_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_by: string
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_by: string
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "min_order_value_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "min_order_value_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "min_order_value_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          module_key: string
          module_label: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key: string
          module_label: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          module_key?: string
          module_label?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          idea_id: string | null
          is_read: boolean
          is_reply: boolean | null
          message: string
          notification_type: string | null
          order_id: string | null
          original_recipients: string[] | null
          sender_id: string | null
          step_id: string | null
          subject: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id?: string | null
          is_read?: boolean
          is_reply?: boolean | null
          message: string
          notification_type?: string | null
          order_id?: string | null
          original_recipients?: string[] | null
          sender_id?: string | null
          step_id?: string | null
          subject?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string | null
          is_read?: boolean
          is_reply?: boolean | null
          message?: string
          notification_type?: string | null
          order_id?: string | null
          original_recipients?: string[] | null
          sender_id?: string | null
          step_id?: string | null
          subject?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "task_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          order_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          order_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          email_status: Database["public"]["Enums"]["email_status"] | null
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          performed_by: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_status"] | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
          performed_by: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_status"] | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_vote_history: {
        Row: {
          changed_at: string
          id: string
          new_reason: string | null
          new_vote: string
          old_reason: string | null
          old_vote: string | null
          order_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_reason?: string | null
          new_vote: string
          old_reason?: string | null
          old_vote?: string | null
          order_id: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_reason?: string | null
          new_vote?: string
          old_reason?: string | null
          old_vote?: string | null
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_vote_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_vote_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_votes: {
        Row: {
          created_at: string
          id: string
          order_id: string
          reason: string | null
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_votes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_votes_missing: {
        Row: {
          id: string
          order_id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          id?: string
          order_id: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_votes_missing_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_votes_missing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          archived_at: string | null
          archived_by: string | null
          bereichsleiter_approved_at: string | null
          bereichsleiter_id: string | null
          created_at: string
          created_by: string
          description: string | null
          escalation_extended_at: string | null
          escalation_extended_by: string | null
          escalation_extended_until: string | null
          escalation_extension_reason: string | null
          id: string
          invoice_to: string | null
          is_archived: boolean
          kassier_bestellt: boolean | null
          kassier_bestellt_at: string | null
          kassier_bestellt_by: string | null
          kommandant_approved_at: string | null
          kommandant_id: string | null
          kommandomitglied_approved_at: string | null
          kommandomitglied_override_at: string | null
          kommandomitglied_override_by: string | null
          kommandomitglied_override_reason: string | null
          order_executed: boolean | null
          order_executed_at: string | null
          order_executed_by: string | null
          order_received: boolean | null
          order_received_at: string | null
          order_received_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_kommandant_approval: boolean
          requires_kommandomitglied_approval: boolean
          reset_at: string | null
          reset_by: string | null
          reset_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          supplier_id: string | null
          title: string
          updated_at: string
          voting_closed_at: string | null
          voting_closed_by: string | null
          voting_last_reminder_at: string | null
          voting_opened_at: string | null
          voting_reminder_count: number | null
          voting_result: string | null
          voting_status: string | null
        }
        Insert: {
          amount: number
          archived_at?: string | null
          archived_by?: string | null
          bereichsleiter_approved_at?: string | null
          bereichsleiter_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          escalation_extended_at?: string | null
          escalation_extended_by?: string | null
          escalation_extended_until?: string | null
          escalation_extension_reason?: string | null
          id?: string
          invoice_to?: string | null
          is_archived?: boolean
          kassier_bestellt?: boolean | null
          kassier_bestellt_at?: string | null
          kassier_bestellt_by?: string | null
          kommandant_approved_at?: string | null
          kommandant_id?: string | null
          kommandomitglied_approved_at?: string | null
          kommandomitglied_override_at?: string | null
          kommandomitglied_override_by?: string | null
          kommandomitglied_override_reason?: string | null
          order_executed?: boolean | null
          order_executed_at?: string | null
          order_executed_by?: string | null
          order_received?: boolean | null
          order_received_at?: string | null
          order_received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_kommandant_approval?: boolean
          requires_kommandomitglied_approval?: boolean
          reset_at?: string | null
          reset_by?: string | null
          reset_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          supplier_id?: string | null
          title: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_last_reminder_at?: string | null
          voting_opened_at?: string | null
          voting_reminder_count?: number | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          archived_by?: string | null
          bereichsleiter_approved_at?: string | null
          bereichsleiter_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          escalation_extended_at?: string | null
          escalation_extended_by?: string | null
          escalation_extended_until?: string | null
          escalation_extension_reason?: string | null
          id?: string
          invoice_to?: string | null
          is_archived?: boolean
          kassier_bestellt?: boolean | null
          kassier_bestellt_at?: string | null
          kassier_bestellt_by?: string | null
          kommandant_approved_at?: string | null
          kommandant_id?: string | null
          kommandomitglied_approved_at?: string | null
          kommandomitglied_override_at?: string | null
          kommandomitglied_override_by?: string | null
          kommandomitglied_override_reason?: string | null
          order_executed?: boolean | null
          order_executed_at?: string | null
          order_executed_by?: string | null
          order_received?: boolean | null
          order_received_at?: string | null
          order_received_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_kommandant_approval?: boolean
          requires_kommandomitglied_approval?: boolean
          reset_at?: string | null
          reset_by?: string | null
          reset_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          supplier_id?: string | null
          title?: string
          updated_at?: string
          voting_closed_at?: string | null
          voting_closed_by?: string | null
          voting_last_reminder_at?: string | null
          voting_opened_at?: string | null
          voting_reminder_count?: number | null
          voting_result?: string | null
          voting_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_bereichsleiter_id_fkey"
            columns: ["bereichsleiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kommandant_id_fkey"
            columns: ["kommandant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_kommandomitglied_override_by_fkey"
            columns: ["kommandomitglied_override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voting_closed_by_fkey"
            columns: ["voting_closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          created_by: string
          email_status: string | null
          id: string
          is_direct_to_organizer: boolean | null
          linked_event_participation_id: string | null
          no_expense_report_required: boolean | null
          notes: string | null
          order_id: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string
          purpose: string
          recipient_iban: string | null
          recipient_name: string
          reference_number: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by: string
          email_status?: string | null
          id?: string
          is_direct_to_organizer?: boolean | null
          linked_event_participation_id?: string | null
          no_expense_report_required?: boolean | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method: string
          purpose: string
          recipient_iban?: string | null
          recipient_name: string
          reference_number: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          created_by?: string
          email_status?: string | null
          id?: string
          is_direct_to_organizer?: boolean | null
          linked_event_participation_id?: string | null
          no_expense_report_required?: boolean | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string
          purpose?: string
          recipient_iban?: string | null
          recipient_name?: string
          reference_number?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_linked_event_participation_id_fkey"
            columns: ["linked_event_participation_id"]
            isOneToOne: false
            referencedRelation: "event_participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_reports: {
        Row: {
          admin_notes: string | null
          browser_info: string | null
          console_logs: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          page_url: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: string | null
          console_logs?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          browser_info?: string | null
          console_logs?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          absence_reason: string | null
          absent_until: string | null
          access_level: string
          created_at: string
          default_bereichsleiter_id: string | null
          email: string
          full_name: string
          functions: string[] | null
          home_page: string
          id: string
          is_absent: boolean | null
          is_active: boolean
          menu_favorites: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          substitute_id: string | null
          todo_notifications: Json | null
          updated_at: string
        }
        Insert: {
          absence_reason?: string | null
          absent_until?: string | null
          access_level?: string
          created_at?: string
          default_bereichsleiter_id?: string | null
          email: string
          full_name?: string
          functions?: string[] | null
          home_page?: string
          id: string
          is_absent?: boolean | null
          is_active?: boolean
          menu_favorites?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          substitute_id?: string | null
          todo_notifications?: Json | null
          updated_at?: string
        }
        Update: {
          absence_reason?: string | null
          absent_until?: string | null
          access_level?: string
          created_at?: string
          default_bereichsleiter_id?: string | null
          email?: string
          full_name?: string
          functions?: string[] | null
          home_page?: string
          id?: string
          is_absent?: boolean | null
          is_active?: boolean
          menu_favorites?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          substitute_id?: string | null
          todo_notifications?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_bereichsleiter_id_fkey"
            columns: ["default_bereichsleiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_substitute_id_fkey"
            columns: ["substitute_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registration_settings: {
        Row: {
          allowed_domain: string
          auto_approve_registration: boolean
          created_at: string | null
          id: string
          require_email_confirmation: boolean
          updated_at: string | null
        }
        Insert: {
          allowed_domain?: string
          auto_approve_registration?: boolean
          created_at?: string | null
          id?: string
          require_email_confirmation?: boolean
          updated_at?: string | null
        }
        Update: {
          allowed_domain?: string
          auto_approve_registration?: boolean
          created_at?: string | null
          id?: string
          require_email_confirmation?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_contracts: {
        Row: {
          additional_costs: number | null
          additional_costs_reason: string | null
          condition_pickup: string | null
          condition_return: string | null
          contract_number: string
          created_at: string
          created_by: string | null
          custom_price: number | null
          customer_address: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          damage_notes: string | null
          delivery_cost: number
          has_custom_price: boolean | null
          id: string
          includes_delivery: boolean
          is_sponsor: boolean
          items: Json
          pdf_url: string | null
          rental_end: string
          rental_start: string
          returned_at: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          additional_costs?: number | null
          additional_costs_reason?: string | null
          condition_pickup?: string | null
          condition_return?: string | null
          contract_number: string
          created_at?: string
          created_by?: string | null
          custom_price?: number | null
          customer_address: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          damage_notes?: string | null
          delivery_cost?: number
          has_custom_price?: boolean | null
          id?: string
          includes_delivery?: boolean
          is_sponsor?: boolean
          items?: Json
          pdf_url?: string | null
          rental_end: string
          rental_start: string
          returned_at?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          additional_costs?: number | null
          additional_costs_reason?: string | null
          condition_pickup?: string | null
          condition_return?: string | null
          contract_number?: string
          created_at?: string
          created_by?: string | null
          custom_price?: number | null
          customer_address?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          damage_notes?: string | null
          delivery_cost?: number
          has_custom_price?: boolean | null
          id?: string
          includes_delivery?: boolean
          is_sponsor?: boolean
          items?: Json
          pdf_url?: string | null
          rental_end?: string
          rental_start?: string
          returned_at?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      rental_items: {
        Row: {
          condition_notes: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_single_item: boolean
          item_type: string
          name: string
          price_2days: number
          price_3days: number
          price_day: number | null
          price_short: number | null
          price_week: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_single_item?: boolean
          item_type?: string
          name: string
          price_2days?: number
          price_3days?: number
          price_day?: number | null
          price_short?: number | null
          price_week?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          condition_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_single_item?: boolean
          item_type?: string
          name?: string
          price_2days?: number
          price_3days?: number
          price_day?: number | null
          price_short?: number | null
          price_week?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          supplier_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          supplier_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          supplier_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_bereichsleiter_id: string | null
          created_at: string
          created_by: string | null
          customer_number: string | null
          discount_percent: number | null
          id: string
          is_approved: boolean
          link: string | null
          minimum_order_value: number | null
          name: string
          offered_articles: string | null
          order_days: string[] | null
          order_email: string | null
          order_methods: string[] | null
          order_phone: string | null
          password: string | null
          payment_terms: string | null
          special_conditions: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_bereichsleiter_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          discount_percent?: number | null
          id?: string
          is_approved?: boolean
          link?: string | null
          minimum_order_value?: number | null
          name: string
          offered_articles?: string | null
          order_days?: string[] | null
          order_email?: string | null
          order_methods?: string[] | null
          order_phone?: string | null
          password?: string | null
          payment_terms?: string | null
          special_conditions?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_bereichsleiter_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          discount_percent?: number | null
          id?: string
          is_approved?: boolean
          link?: string | null
          minimum_order_value?: number | null
          name?: string
          offered_articles?: string | null
          order_days?: string[] | null
          order_email?: string | null
          order_methods?: string[] | null
          order_phone?: string | null
          password?: string | null
          payment_terms?: string | null
          special_conditions?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string
          depends_on: string | null
          description: string | null
          end_date: string
          id: string
          is_recurring: boolean
          parent_task_id: string | null
          priority: string
          progress: number
          recurrence_interval: number | null
          recurrence_type: Database["public"]["Enums"]["recurrence_type"] | null
          start_date: string
          status: string
          title: string
          updated_at: string
          visible_to_all: boolean
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          depends_on?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_recurring?: boolean
          parent_task_id?: string | null
          priority?: string
          progress?: number
          recurrence_interval?: number | null
          recurrence_type?:
            | Database["public"]["Enums"]["recurrence_type"]
            | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
          visible_to_all?: boolean
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          depends_on?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_recurring?: boolean
          parent_task_id?: string | null
          priority?: string
          progress?: number
          recurrence_interval?: number | null
          recurrence_type?:
            | Database["public"]["Enums"]["recurrence_type"]
            | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          visible_to_all?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      todo_group_shares: {
        Row: {
          created_at: string
          group_id: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          permission?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_group_shares_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "todo_list_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_list_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      todo_list_shares: {
        Row: {
          created_at: string
          id: string
          list_id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          permission?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_list_shares_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "todo_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_lists: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          group_id: string | null
          icon: string | null
          id: string
          is_smart_list: boolean
          name: string
          show_completed: boolean
          smart_list_type: string | null
          sort_by: string
          sort_direction: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          group_id?: string | null
          icon?: string | null
          id?: string
          is_smart_list?: boolean
          name: string
          show_completed?: boolean
          smart_list_type?: string | null
          sort_by?: string
          sort_direction?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          group_id?: string | null
          icon?: string | null
          id?: string
          is_smart_list?: boolean
          name?: string
          show_completed?: boolean
          smart_list_type?: string | null
          sort_by?: string
          sort_direction?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_lists_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "todo_list_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "todo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_task_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_task_shares_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "todo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_task_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "todo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_tasks: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          attachment_name: string | null
          attachment_url: string | null
          change_history: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          due_date: string | null
          due_date_changed_at: string | null
          due_date_changed_by: string | null
          due_time: string | null
          id: string
          is_completed: boolean
          is_important: boolean
          is_in_my_day: boolean
          list_id: string
          my_day_date: string | null
          notes: string | null
          notes_updated_at: string | null
          notes_updated_by: string | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          reminder_at: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          change_history?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          due_date_changed_at?: string | null
          due_date_changed_by?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          is_important?: boolean
          is_in_my_day?: boolean
          list_id: string
          my_day_date?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder_at?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          change_history?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          due_date_changed_at?: string | null
          due_date_changed_by?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          is_important?: boolean
          is_in_my_day?: boolean
          list_id?: string
          my_day_date?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          reminder_at?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "todo_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_meeting: { Args: { p_meeting_id: string }; Returns: boolean }
      can_manage_meetings: { Args: never; Returns: boolean }
      can_view_meetings: { Args: never; Returns: boolean }
      check_and_escalate_orders: {
        Args: never
        Returns: {
          escalated_count: number
          escalated_orders: string[]
        }[]
      }
      generate_expense_report_number: { Args: never; Returns: string }
      generate_rental_contract_number: { Args: never; Returns: string }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_group_owner: { Args: { _group_id: string }; Returns: boolean }
      is_list_group_member: { Args: { _list_id: string }; Returns: boolean }
      is_list_member: { Args: { _list_id: string }; Returns: boolean }
      is_list_owner: { Args: { _list_id: string }; Returns: boolean }
      is_meeting_attendee: { Args: { p_meeting_id: string }; Returns: boolean }
      is_task_member: { Args: { _task_id: string }; Returns: boolean }
      is_task_owner: { Args: { _task_id: string }; Returns: boolean }
      user_has_meeting_invitations: { Args: never; Returns: boolean }
      user_has_step_in_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agenda_item_status: "offen" | "behandelt" | "vertagt" | "zurueckgestellt"
      attendance_status:
        | "anwesend"
        | "remote"
        | "entschuldigt"
        | "unentschuldigt"
        | "offen"
      email_status: "none" | "sent" | "failed" | "partial"
      meeting_status: "geplant" | "laufend" | "abgeschlossen" | "abgesagt"
      meeting_type: "kommandositzung" | "erweitertes_kommando"
      order_status:
        | "entwurf"
        | "eingereicht"
        | "ausstehend_bereichsleitung"
        | "ausstehend_kommandant"
        | "freigegeben_bereichsleitung"
        | "genehmigt"
        | "abgelehnt"
        | "abgeschlossen"
        | "ausstehend_kommandomitglieder"
        | "freigegeben_kommandant"
      recurrence_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "custom"
      user_role:
        | "mitglied"
        | "admin"
        | "bereichsleiter"
        | "kommandant"
        | "nutzer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agenda_item_status: ["offen", "behandelt", "vertagt", "zurueckgestellt"],
      attendance_status: [
        "anwesend",
        "remote",
        "entschuldigt",
        "unentschuldigt",
        "offen",
      ],
      email_status: ["none", "sent", "failed", "partial"],
      meeting_status: ["geplant", "laufend", "abgeschlossen", "abgesagt"],
      meeting_type: ["kommandositzung", "erweitertes_kommando"],
      order_status: [
        "entwurf",
        "eingereicht",
        "ausstehend_bereichsleitung",
        "ausstehend_kommandant",
        "freigegeben_bereichsleitung",
        "genehmigt",
        "abgelehnt",
        "abgeschlossen",
        "ausstehend_kommandomitglieder",
        "freigegeben_kommandant",
      ],
      recurrence_type: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ],
      user_role: [
        "mitglied",
        "admin",
        "bereichsleiter",
        "kommandant",
        "nutzer",
      ],
    },
  },
} as const

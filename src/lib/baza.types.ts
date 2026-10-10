export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anonimizirani_igralci: {
        Row: {
          kljuc: string
          player_id: number
        }
        ComputedFields: never
        Insert: {
          kljuc: string
          player_id: number
        }
        Update: {
          kljuc?: string
          player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonimizirani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      appearances: {
        Row: {
          clean_sheet: boolean
          goals: number
          goals_conceded: number
          id: number
          is_goalkeeper: boolean
          match_id: number
          minute_off: number
          minute_on: number
          minutes_played: number
          own_goals: number
          penalties_missed: number
          penalties_saved: number
          penalties_scored: number
          player_id: number
          red_cards: number
          shirt_number: number | null
          started: boolean
          team_id: number
          yellow_cards: number
        }
        ComputedFields: never
        Insert: {
          clean_sheet?: boolean
          goals?: number
          goals_conceded?: number
          id?: never
          is_goalkeeper?: boolean
          match_id: number
          minute_off?: number
          minute_on?: number
          minutes_played?: number
          own_goals?: number
          penalties_missed?: number
          penalties_saved?: number
          penalties_scored?: number
          player_id: number
          red_cards?: number
          shirt_number?: number | null
          started?: boolean
          team_id: number
          yellow_cards?: number
        }
        Update: {
          clean_sheet?: boolean
          goals?: number
          goals_conceded?: number
          id?: never
          is_goalkeeper?: boolean
          match_id?: number
          minute_off?: number
          minute_on?: number
          minutes_played?: number
          own_goals?: number
          penalties_missed?: number
          penalties_saved?: number
          penalties_scored?: number
          player_id?: number
          red_cards?: number
          shirt_number?: number | null
          started?: boolean
          team_id?: number
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "appearances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "appearances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "appearances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "appearances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "appearances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "appearances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      assist_votes: {
        Row: {
          created_at: string
          goal_id: number
          id: number
          player_id: number | null
          voter_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          goal_id: number
          id?: never
          player_id?: number | null
          voter_id: string
        }
        Update: {
          created_at?: string
          goal_id?: number
          id?: never
          player_id?: number | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assist_votes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "assist_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assist_votes_deleted: {
        Row: {
          created_at: string | null
          deleted_at: string
          deleted_by: string | null
          goal_id: number | null
          id: number
          player_id: number | null
          reason: string | null
          voter_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          goal_id?: number | null
          id: number
          player_id?: number | null
          reason?: string | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          goal_id?: number | null
          id?: number
          player_id?: number | null
          reason?: string | null
          voter_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          alias: string
          content: string
          country_code: string
          created_at: string
          id: number
          user_id: string
        }
        ComputedFields: never
        Insert: {
          alias: string
          content: string
          country_code?: string
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          alias?: string
          content?: string
          country_code?: string
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_settings: {
        Row: {
          competition_id: number
          key: string
          value: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          competition_id: number
          key: string
          value: NonNullable<Json>
        }
        Update: {
          competition_id?: number
          key?: string
          value?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: "competition_settings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_settings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_settings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      competitions: {
        Row: {
          active: boolean
          country_id: number
          federation_id: number | null
          id: number
          mnzg_liga: string | null
          name: string
          prvi_fantasy_krog: number
          rok_pomak_ur: number
          short_name: string
          slug: string
          sort_order: number
          source: string
          source_league_code: string | null
          vir_ime: string | null
          vir_url: string | null
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          country_id: number
          federation_id?: number | null
          id?: never
          mnzg_liga?: string | null
          name: string
          prvi_fantasy_krog?: number
          rok_pomak_ur?: number
          short_name: string
          slug: string
          sort_order?: number
          source: string
          source_league_code?: string | null
          vir_ime?: string | null
          vir_url?: string | null
        }
        Update: {
          active?: boolean
          country_id?: number
          federation_id?: number | null
          id?: never
          mnzg_liga?: string | null
          name?: string
          prvi_fantasy_krog?: number
          rok_pomak_ur?: number
          short_name?: string
          slug?: string
          sort_order?: number
          source?: string
          source_league_code?: string | null
          vir_ime?: string | null
          vir_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_federation_id_fkey"
            columns: ["federation_id"]
            isOneToOne: false
            referencedRelation: "federations"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          active: boolean
          code: string
          id: number
          name: string
          sort_order: number
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          code: string
          id?: never
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          id?: never
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_log: {
        Row: {
          competition_id: number | null
          email: string
          id: number
          kanal: string
          napaka: string | null
          poslano_at: string
          resend_id: string | null
          round_id: number | null
          user_id: string | null
          vrsta: string
        }
        ComputedFields: never
        Insert: {
          competition_id?: number | null
          email: string
          id?: never
          kanal?: string
          napaka?: string | null
          poslano_at?: string
          resend_id?: string | null
          round_id?: number | null
          user_id?: string | null
          vrsta: string
        }
        Update: {
          competition_id?: number | null
          email?: string
          id?: never
          kanal?: string
          napaka?: string | null
          poslano_at?: string
          resend_id?: string | null
          round_id?: number | null
          user_id?: string | null
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "email_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "email_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_chips: {
        Row: {
          chip: string
          fantasy_team_id: number
          played_at: string
          round_id: number
          season: string
        }
        ComputedFields: never
        Insert: {
          chip: string
          fantasy_team_id: number
          played_at?: string
          round_id: number
          season?: string
        }
        Update: {
          chip?: string
          fantasy_team_id?: number
          played_at?: string
          round_id?: number
          season?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_chips_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "fantasy_chips_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_chips_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_chips_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_lineups: {
        Row: {
          bench_order: number | null
          captured_at: string
          fantasy_team_id: number
          is_captain: boolean
          is_starter: boolean
          is_vice: boolean
          player_id: number
          position: string | null
          round_id: number
        }
        ComputedFields: never
        Insert: {
          bench_order?: number | null
          captured_at?: string
          fantasy_team_id: number
          is_captain?: boolean
          is_starter: boolean
          is_vice?: boolean
          player_id: number
          position?: string | null
          round_id: number
        }
        Update: {
          bench_order?: number | null
          captured_at?: string
          fantasy_team_id?: number
          is_captain?: boolean
          is_starter?: boolean
          is_vice?: boolean
          player_id?: number
          position?: string | null
          round_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "fantasy_lineups_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineups_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_roster: {
        Row: {
          bench_order: number | null
          buy_position: string | null
          buy_value: number | null
          fantasy_team_id: number
          is_captain: boolean
          is_starter: boolean
          is_vice: boolean
          player_id: number
        }
        ComputedFields: never
        Insert: {
          bench_order?: number | null
          buy_position?: string | null
          buy_value?: number | null
          fantasy_team_id: number
          is_captain?: boolean
          is_starter?: boolean
          is_vice?: boolean
          player_id: number
        }
        Update: {
          bench_order?: number | null
          buy_position?: string | null
          buy_value?: number | null
          fantasy_team_id?: number
          is_captain?: boolean
          is_starter?: boolean
          is_vice?: boolean
          player_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_roster_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      fantasy_teams: {
        Row: {
          budget: number
          cash: number
          competition_id: number
          created_at: string
          display_name: string | null
          hisna: boolean
          id: number
          name: string
          owner_id: string
          roster_updated_at: string
        }
        ComputedFields: never
        Insert: {
          budget?: number
          cash?: number
          competition_id?: number
          created_at?: string
          display_name?: string | null
          hisna?: boolean
          id?: never
          name: string
          owner_id: string
          roster_updated_at?: string
        }
        Update: {
          budget?: number
          cash?: number
          competition_id?: number
          created_at?: string
          display_name?: string | null
          hisna?: boolean
          id?: never
          name?: string
          owner_id?: string
          roster_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "fantasy_teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_transfers: {
        Row: {
          created_at: string
          fantasy_team_id: number
          free_transfers: number
          penalty: number
          round_id: number
          transfers: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          fantasy_team_id: number
          free_transfers?: number
          penalty?: number
          round_id: number
          transfers?: number
        }
        Update: {
          created_at?: string
          fantasy_team_id?: number
          free_transfers?: number
          penalty?: number
          round_id?: number
          transfers?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "fantasy_transfers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_transfers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_transfers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      federations: {
        Row: {
          active: boolean
          code: string
          country_id: number
          id: number
          name: string
          short_name: string
          site_url: string | null
          sort_order: number
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          code: string
          country_id: number
          id?: never
          name: string
          short_name: string
          site_url?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          country_id?: number
          id?: never
          name?: string
          short_name?: string
          site_url?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "federations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          assist_confirmed_at: string | null
          assist_none_confirmed_at: string | null
          assist_player_id: number | null
          id: number
          is_own_goal: boolean
          is_penalty: boolean
          match_id: number
          minute: number | null
          score_away: number | null
          score_home: number | null
          scorer_id: number | null
          team_id: number
        }
        ComputedFields: never
        Insert: {
          assist_confirmed_at?: string | null
          assist_none_confirmed_at?: string | null
          assist_player_id?: number | null
          id?: never
          is_own_goal?: boolean
          is_penalty?: boolean
          match_id: number
          minute?: number | null
          score_away?: number | null
          score_home?: number | null
          scorer_id?: number | null
          team_id: number
        }
        Update: {
          assist_confirmed_at?: string | null
          assist_none_confirmed_at?: string | null
          assist_player_id?: number | null
          id?: never
          is_own_goal?: boolean
          is_penalty?: boolean
          match_id?: number
          minute?: number | null
          score_away?: number | null
          score_home?: number | null
          scorer_id?: number | null
          team_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      klub_stik: {
        Row: {
          created_at: string
          drzava: string
          email: string | null
          id: number
          klub: string
          kontakt: string | null
          liga_slug: string | null
          mailov: number
          odgovorni: string | null
          opomba: string | null
          stanje: string
          team_id: number | null
          updated_at: string
          updated_by: string | null
          vir_url: string | null
          zadnji_mail_at: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          drzava: string
          email?: string | null
          id?: never
          klub: string
          kontakt?: string | null
          liga_slug?: string | null
          mailov?: number
          odgovorni?: string | null
          opomba?: string | null
          stanje?: string
          team_id?: number | null
          updated_at?: string
          updated_by?: string | null
          vir_url?: string | null
          zadnji_mail_at?: string | null
        }
        Update: {
          created_at?: string
          drzava?: string
          email?: string | null
          id?: never
          klub?: string
          kontakt?: string | null
          liga_slug?: string | null
          mailov?: number
          odgovorni?: string | null
          opomba?: string | null
          stanje?: string
          team_id?: number | null
          updated_at?: string
          updated_by?: string | null
          vir_url?: string | null
          zadnji_mail_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klub_stik_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_stik_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_stik_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_stik_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      klub_stik_posta: {
        Row: {
          created_by: string | null
          gmail_nit: string | null
          id: number
          opomba: string | null
          poslal: string | null
          poslano_at: string
          stik_id: number
          telo: string | null
          vrsta: string
          za: string | null
          zadeva: string | null
        }
        ComputedFields: never
        Insert: {
          created_by?: string | null
          gmail_nit?: string | null
          id?: never
          opomba?: string | null
          poslal?: string | null
          poslano_at?: string
          stik_id: number
          telo?: string | null
          vrsta?: string
          za?: string | null
          zadeva?: string | null
        }
        Update: {
          created_by?: string | null
          gmail_nit?: string | null
          id?: never
          opomba?: string | null
          poslal?: string | null
          poslano_at?: string
          stik_id?: number
          telo?: string | null
          vrsta?: string
          za?: string | null
          zadeva?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klub_stik_posta_stik_id_fkey"
            columns: ["stik_id"]
            isOneToOne: false
            referencedRelation: "klub_stik"
            referencedColumns: ["id"]
          },
        ]
      }
      lijak_dnevno: {
        Row: {
          dan: string
          korak: string
          stevilo: number
        }
        ComputedFields: never
        Insert: {
          dan?: string
          korak: string
          stevilo?: number
        }
        Update: {
          dan?: string
          korak?: string
          stevilo?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_goals: number
          away_team_id: number
          home_goals: number
          home_team_id: number
          id: number
          import_warnings: string[]
          imported_at: string | null
          kontumacija: boolean
          played_on: string | null
          round_id: number
          source_url: string | null
          vir_brez_izida: boolean
          zapisnik_id: string | null
        }
        ComputedFields: never
        Insert: {
          away_goals?: number
          away_team_id: number
          home_goals?: number
          home_team_id: number
          id?: never
          import_warnings?: string[]
          imported_at?: string | null
          kontumacija?: boolean
          played_on?: string | null
          round_id: number
          source_url?: string | null
          vir_brez_izida?: boolean
          zapisnik_id?: string | null
        }
        Update: {
          away_goals?: number
          away_team_id?: number
          home_goals?: number
          home_team_id?: number
          id?: never
          import_warnings?: string[]
          imported_at?: string | null
          kontumacija?: boolean
          played_on?: string | null
          round_id?: number
          source_url?: string | null
          vir_brez_izida?: boolean
          zapisnik_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_liga_clani: {
        Row: {
          fantasy_team_id: number
          joined_at: string
          mini_liga_id: number
        }
        ComputedFields: never
        Insert: {
          fantasy_team_id: number
          joined_at?: string
          mini_liga_id: number
        }
        Update: {
          fantasy_team_id?: number
          joined_at?: string
          mini_liga_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_clani_mini_liga_id_fkey"
            columns: ["mini_liga_id"]
            isOneToOne: false
            referencedRelation: "mini_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_lige: {
        Row: {
          code: string
          created_at: string
          id: number
          name: string
          owner_id: string
        }
        ComputedFields: never
        Insert: {
          code: string
          created_at?: string
          id?: never
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_lige_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      obiski_dnevno: {
        Row: {
          dan: string
          skupina: string
          stevilo: number
          stran: string
        }
        ComputedFields: never
        Insert: {
          dan?: string
          skupina: string
          stevilo?: number
          stran: string
        }
        Update: {
          dan?: string
          skupina?: string
          stevilo?: number
          stran?: string
        }
        Relationships: []
      }
      odjava_kljuc: {
        Row: {
          id: number
          kljuc: string
        }
        ComputedFields: never
        Insert: {
          id?: number
          kljuc: string
        }
        Update: {
          id?: number
          kljuc?: string
        }
        Relationships: []
      }
      player_reports: {
        Row: {
          content: string
          created_at: string
          id: number
          kind: string
          player_id: number
          user_id: string
        }
        ComputedFields: never
        Insert: {
          content: string
          created_at?: string
          id?: never
          kind: string
          player_id: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          kind?: string
          player_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_scores: {
        Row: {
          computed_at: string
          player_id: number
          points: number
          round_id: number
        }
        ComputedFields: never
        Insert: {
          computed_at?: string
          player_id: number
          points: number
          round_id: number
        }
        Update: {
          computed_at?: string
          player_id?: number
          points?: number
          round_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          anonimiziran_at: string | null
          anonimiziran_razlog: string | null
          competition_id: number
          first_name: string
          full_name: string | null
          id: number
          izstopil_at: string | null
          last_name: string
          nzs_birth_year: number | null
          nzs_confirmed_at: string | null
          nzs_top_league: string | null
          nzs_top_league_minutes: number | null
          nzs_url: string | null
          odsel_at: string | null
          odsel_by: string | null
          position: string | null
          position_source: string
          reg_st: number | null
          repriced_at: string | null
          repriced_week: string | null
          shirt_number: number | null
          team_id: number
          value: number
          value_locked: boolean
          value_start: number | null
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          anonimiziran_at?: string | null
          anonimiziran_razlog?: string | null
          competition_id?: number
          first_name: string
          full_name?: string | null
          id?: never
          izstopil_at?: string | null
          last_name: string
          nzs_birth_year?: number | null
          nzs_confirmed_at?: string | null
          nzs_top_league?: string | null
          nzs_top_league_minutes?: number | null
          nzs_url?: string | null
          odsel_at?: string | null
          odsel_by?: string | null
          position?: string | null
          position_source?: string
          reg_st?: number | null
          repriced_at?: string | null
          repriced_week?: string | null
          shirt_number?: number | null
          team_id: number
          value?: number
          value_locked?: boolean
          value_start?: number | null
        }
        Update: {
          active?: boolean
          anonimiziran_at?: string | null
          anonimiziran_razlog?: string | null
          competition_id?: number
          first_name?: string
          full_name?: string | null
          id?: never
          izstopil_at?: string | null
          last_name?: string
          nzs_birth_year?: number | null
          nzs_confirmed_at?: string | null
          nzs_top_league?: string | null
          nzs_top_league_minutes?: number | null
          nzs_url?: string | null
          odsel_at?: string | null
          odsel_by?: string | null
          position?: string | null
          position_source?: string
          reg_st?: number | null
          repriced_at?: string | null
          repriced_week?: string | null
          shirt_number?: number | null
          team_id?: number
          value?: number
          value_locked?: boolean
          value_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "players_odsel_by_fkey"
            columns: ["odsel_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      position_priors: {
        Row: {
          player_id: number
          position: string
          score: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          player_id: number
          position: string
          score?: number
          updated_at?: string
        }
        Update: {
          player_id?: number
          position?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      position_votes: {
        Row: {
          created_at: string
          id: number
          player_id: number
          position: string
          voter_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: never
          player_id: number
          position: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: never
          player_id?: number
          position?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_votes_deleted: {
        Row: {
          created_at: string | null
          deleted_at: string
          deleted_by: string | null
          id: number
          player_id: number | null
          position: string | null
          reason: string | null
          voter_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          id: number
          player_id?: number | null
          position?: string | null
          reason?: string | null
          voter_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string
          deleted_by?: string | null
          id?: number
          player_id?: number | null
          position?: string | null
          reason?: string | null
          voter_id?: string | null
        }
        Relationships: []
      }
      poznavalec_prosnje: {
        Row: {
          competition_id: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: number
          sporocilo: string | null
          status: string
          team_id: number | null
          user_id: string
          vloga: string
        }
        ComputedFields: never
        Insert: {
          competition_id: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: never
          sporocilo?: string | null
          status?: string
          team_id?: number | null
          user_id: string
          vloga: string
        }
        Update: {
          competition_id?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: never
          sporocilo?: string | null
          status?: string
          team_id?: number | null
          user_id?: string
          vloga?: string
        }
        Relationships: [
          {
            foreignKeyName: "poznavalec_prosnje_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poznavalec_prosnje_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_changes: {
        Row: {
          changed_at: string
          form: number
          id: number
          new_value: number
          old_value: number
          player_id: number
          round_id: number
        }
        ComputedFields: never
        Insert: {
          changed_at?: string
          form: number
          id?: never
          new_value: number
          old_value: number
          player_id: number
          round_id: number
        }
        Update: {
          changed_at?: string
          form?: number
          id?: never
          new_value?: number
          old_value?: number
          player_id?: number
          round_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "price_changes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "price_changes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_changes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brez_opomnikov: boolean
          brez_push: boolean
          created_at: string
          display_name: string
          id: string
          insider_competition_id: number | null
          insider_team_id: number | null
          is_admin: boolean
          navijam_team_id: number | null
        }
        ComputedFields: never
        Insert: {
          brez_opomnikov?: boolean
          brez_push?: boolean
          created_at?: string
          display_name: string
          id: string
          insider_competition_id?: number | null
          insider_team_id?: number | null
          is_admin?: boolean
          navijam_team_id?: number | null
        }
        Update: {
          brez_opomnikov?: boolean
          brez_push?: boolean
          created_at?: string
          display_name?: string
          id?: string
          insider_competition_id?: number | null
          insider_team_id?: number | null
          is_admin?: boolean
          navijam_team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_insider_competition_id_fkey"
            columns: ["insider_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_insider_competition_id_fkey"
            columns: ["insider_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_insider_competition_id_fkey"
            columns: ["insider_competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "profiles_insider_team_id_fkey"
            columns: ["insider_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_insider_team_id_fkey"
            columns: ["insider_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_insider_team_id_fkey"
            columns: ["insider_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_insider_team_id_fkey"
            columns: ["insider_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_navijam_team_id_fkey"
            columns: ["navijam_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_navijam_team_id_fkey"
            columns: ["navijam_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_navijam_team_id_fkey"
            columns: ["navijam_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "profiles_navijam_team_id_fkey"
            columns: ["navijam_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          platforma: string
          token: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          platforma: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platforma?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          borza_po_starem: boolean
          borza_z_odmikom: boolean
          competition_id: number
          deadline_at: string | null
          id: number
          lineups_locked_at: string | null
          number: number
          played_on: string | null
          pravila_tockovanja: number
          season: string
          voting_closes_at: string | null
          voting_opens_at: string | null
        }
        ComputedFields: never
        Insert: {
          borza_po_starem?: boolean
          borza_z_odmikom?: boolean
          competition_id?: number
          deadline_at?: string | null
          id?: never
          lineups_locked_at?: string | null
          number: number
          played_on?: string | null
          pravila_tockovanja?: number
          season: string
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Update: {
          borza_po_starem?: boolean
          borza_z_odmikom?: boolean
          competition_id?: number
          deadline_at?: string | null
          id?: never
          lineups_locked_at?: string | null
          number?: number
          played_on?: string | null
          pravila_tockovanja?: number
          season?: string
          voting_closes_at?: string | null
          voting_opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          key: string
          value: NonNullable<Json>
        }
        Update: {
          key?: string
          value?: NonNullable<Json>
        }
        Relationships: []
      }
      sponsor_stats: {
        Row: {
          competition_id: number | null
          dan: string
          id: number
          klikov: number
          mesto: string | null
          prikazov: number
          sponsor_id: number
        }
        ComputedFields: never
        Insert: {
          competition_id?: number | null
          dan: string
          id?: never
          klikov?: number
          mesto?: string | null
          prikazov?: number
          sponsor_id: number
        }
        Update: {
          competition_id?: number | null
          dan?: string
          id?: never
          klikov?: number
          mesto?: string | null
          prikazov?: number
          sponsor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "sponsor_stats_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          active: boolean
          claim: string | null
          competition_id: number | null
          country_id: number | null
          created_at: string
          ends_on: string | null
          federation_id: number | null
          id: number
          logo_url: string | null
          mesta: string[]
          name: string
          opomba: string | null
          slika_url: string | null
          starts_on: string | null
          updated_at: string
          url: string
          utez: number
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          claim?: string | null
          competition_id?: number | null
          country_id?: number | null
          created_at?: string
          ends_on?: string | null
          federation_id?: number | null
          id?: never
          logo_url?: string | null
          mesta?: string[]
          name: string
          opomba?: string | null
          slika_url?: string | null
          starts_on?: string | null
          updated_at?: string
          url: string
          utez?: number
        }
        Update: {
          active?: boolean
          claim?: string | null
          competition_id?: number | null
          country_id?: number | null
          created_at?: string
          ends_on?: string | null
          federation_id?: number | null
          id?: never
          logo_url?: string | null
          mesta?: string[]
          name?: string
          opomba?: string | null
          slika_url?: string | null
          starts_on?: string | null
          updated_at?: string
          url?: string
          utez?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "sponsors_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_federation_id_fkey"
            columns: ["federation_id"]
            isOneToOne: false
            referencedRelation: "federations"
            referencedColumns: ["id"]
          },
        ]
      }
      statistika_igralcev: {
        Row: {
          assists: number
          clean_sheets: number
          competition_id: number
          form: number
          goals: number
          last_round: number
          matches: number
          minutes: number
          own_goals: number
          player_id: number
          points: number
          red_cards: number
          season: string
          yellow_cards: number
        }
        ComputedFields: never
        Insert: {
          assists: number
          clean_sheets: number
          competition_id: number
          form?: number
          goals: number
          last_round?: number
          matches: number
          minutes: number
          own_goals: number
          player_id: number
          points: number
          red_cards: number
          season: string
          yellow_cards: number
        }
        Update: {
          assists?: number
          clean_sheets?: number
          competition_id?: number
          form?: number
          goals?: number
          last_round?: number
          matches?: number
          minutes?: number
          own_goals?: number
          player_id?: number
          points?: number
          red_cards?: number
          season?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      stiki_kljuc: {
        Row: {
          id: number
          kljuc: string
        }
        ComputedFields: never
        Insert: {
          id?: number
          kljuc: string
        }
        Update: {
          id?: number
          kljuc?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          country_id: number
          id: number
          logo_url: string | null
          name: string
          short_name: string | null
        }
        ComputedFields: never
        Insert: {
          country_id: number
          id?: never
          logo_url?: string | null
          name: string
          short_name?: string | null
        }
        Update: {
          country_id?: number
          id?: never
          logo_url?: string | null
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      tocke_krogov: {
        Row: {
          fantasy_team_id: number
          penalty: number
          points: number
          round_id: number
          transfers: number
        }
        ComputedFields: never
        Insert: {
          fantasy_team_id: number
          penalty: number
          points: number
          round_id: number
          transfers: number
        }
        Update: {
          fantasy_team_id?: number
          penalty?: number
          points?: number
          round_id?: number
          transfers?: number
        }
        Relationships: [
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appearance_points: {
        Row: {
          appearance_id: number | null
          assists: number | null
          cista_mreza: boolean | null
          clean_sheet: boolean | null
          goals: number | null
          goals_conceded: number | null
          match_id: number | null
          minutes_played: number | null
          player_id: number | null
          points: number | null
          position: string | null
          pravila: number | null
          prejeti_na_igriscu: number | null
          round_id: number | null
          zmaga: boolean | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "appearances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "appearances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      assist_vote_counts: {
        Row: {
          goal_id: number | null
          player_id: number | null
          votes: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "assist_votes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assist_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      competition_teams: {
        Row: {
          competition_id: number | null
          logo_url: string | null
          name: string | null
          short_name: string | null
          team_id: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      competitions_view: {
        Row: {
          active: boolean | null
          country_code: string | null
          country_id: number | null
          country_name: string | null
          federation_code: string | null
          federation_id: number | null
          federation_name: string | null
          federation_short: string | null
          federation_sort: number | null
          federation_url: string | null
          id: number | null
          mnzg_liga: string | null
          name: string | null
          prvi_fantasy_krog: number | null
          rok_pomak_ur: number | null
          short_name: string | null
          slug: string | null
          sort_order: number | null
          source: string | null
          source_league_code: string | null
          vir_ime: string | null
          vir_url: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "competitions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_federation_id_fkey"
            columns: ["federation_id"]
            isOneToOne: false
            referencedRelation: "federations"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_round_points: {
        Row: {
          competition_id: number | null
          fantasy_team_id: number | null
          penalty: number | null
          points: number | null
          round_id: number | null
          round_number: number | null
          season: string | null
          transfers: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_round_points_izracun: {
        Row: {
          competition_id: number | null
          fantasy_team_id: number | null
          penalty: number | null
          points: number | null
          round_id: number | null
          round_number: number | null
          season: string | null
          transfers: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      fantasy_round_standings: {
        Row: {
          competition_id: number | null
          fantasy_team_id: number | null
          owner_name: string | null
          penalty: number | null
          points: number | null
          rank: number | null
          round_id: number | null
          round_number: number | null
          season: string | null
          team_name: string | null
          transfers: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_fantasy_team_id_fkey"
            columns: ["fantasy_team_id"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tocke_krogov_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_team_budget: {
        Row: {
          budget: number | null
          competition_id: number | null
          fantasy_team_id: number | null
          name: string | null
          remaining: number | null
          spent: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      fantasy_team_standings: {
        Row: {
          best_round: number | null
          competition_id: number | null
          fantasy_team_id: number | null
          hisna: boolean | null
          owner_name: string | null
          owner_registered_at: string | null
          rounds_played: number | null
          team_created_at: string | null
          team_name: string | null
          total_points: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      fantasy_team_wealth: {
        Row: {
          cash: number | null
          competition_id: number | null
          fantasy_team_id: number | null
          name: string | null
          roster_value: number | null
          starting_budget: number | null
          total_wealth: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      klepet_sporocila: {
        Row: {
          alias: string | null
          content: string | null
          country_code: string | null
          created_at: string | null
          id: number | null
          je_moje: boolean | null
        }
        ComputedFields: never
        Insert: {
          alias?: string | null
          content?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: number | null
          je_moje?: never
        }
        Update: {
          alias?: string | null
          content?: string | null
          country_code?: string | null
          created_at?: string | null
          id?: number | null
          je_moje?: never
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      krog_najboljsi: {
        Row: {
          competition_id: number | null
          full_name: string | null
          minutes: number | null
          player_id: number | null
          points: number | null
          position: string | null
          price_delta: number | null
          rank: number | null
          round_id: number | null
          round_number: number | null
          season: string | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          value: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      lestvica_drzavna: {
        Row: {
          best_round: number | null
          competition_id: number | null
          competition_name: string | null
          competition_short: string | null
          competition_slug: string | null
          fantasy_team_id: number | null
          federation_name: string | null
          federation_short: string | null
          owner_name: string | null
          points_per_round: number | null
          rounds_played: number | null
          team_name: string | null
          total_points: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      match_assist_status: {
        Row: {
          away_goals: number | null
          away_logo: string | null
          away_name: string | null
          away_short: string | null
          away_team_id: number | null
          brez_asistence: number | null
          competition_id: number | null
          glasovanje_do: string | null
          glasovanje_odprto: boolean | null
          golov: number | null
          home_goals: number | null
          home_logo: string | null
          home_name: string | null
          home_short: string | null
          home_team_id: number | null
          match_id: number | null
          played_on: string | null
          round_id: number | null
          round_number: number | null
          season: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      mini_liga_lestvica: {
        Row: {
          competition_short: string | null
          competition_slug: string | null
          fantasy_team_id: number | null
          federation_short: string | null
          joined_at: string | null
          mini_liga_id: number | null
          owner_name: string | null
          points_per_round: number | null
          rounds_played: number | null
          team_name: string | null
          total_points: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "mini_liga_clani_mini_liga_id_fkey"
            columns: ["mini_liga_id"]
            isOneToOne: false
            referencedRelation: "mini_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      minute_kroga: {
        Row: {
          minutes: number | null
          player_id: number | null
          round_id: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      moj_prispevek: {
        Row: {
          glasov_asistenc: number | null
          glasov_pozicij: number | null
          obveljalo_asistenc: number | null
          obveljalo_pozicij: number | null
          voter_id: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      naslednji_krog: {
        Row: {
          competition_id: number | null
          deadline_at: string | null
          id: number | null
          number: number | null
          played_on: string | null
          season: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      odsotni_igralci: {
        Row: {
          competition_id: number | null
          content: string | null
          created_at: string | null
          kind: string | null
          player_id: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      player_overview: {
        Row: {
          active: boolean | null
          assists: number | null
          clean_sheets: number | null
          competition_id: number | null
          first_name: string | null
          full_name: string | null
          goals: number | null
          id: number | null
          izstopil_at: string | null
          last_name: string | null
          matches: number | null
          minutes: number | null
          points: number | null
          position: string | null
          position_source: string | null
          position_votes: number | null
          shirt_number: number | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          value: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_reports_view: {
        Row: {
          author_name: string | null
          competition_id: number | null
          content: string | null
          created_at: string | null
          id: number | null
          kind: string | null
          player_id: number | null
          player_name: string | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      player_season_standings: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          competition_id: number | null
          form: number | null
          full_name: string | null
          goals: number | null
          id: number | null
          last_round: number | null
          matches: number | null
          minutes: number | null
          owners: number | null
          points: number | null
          points_per_match: number | null
          points_per_value: number | null
          position: string | null
          position_source: string | null
          rank: number | null
          season: string | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          value: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          competition_id: number | null
          goals: number | null
          matches: number | null
          minutes: number | null
          own_goals: number | null
          player_id: number | null
          points: number | null
          red_cards: number | null
          season: string | null
          yellow_cards: number | null
        }
        ComputedFields: never
        Insert: {
          assists?: number | null
          clean_sheets?: number | null
          competition_id?: number | null
          goals?: number | null
          matches?: number | null
          minutes?: number | null
          own_goals?: number | null
          player_id?: number | null
          points?: number | null
          red_cards?: number | null
          season?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          clean_sheets?: number | null
          competition_id?: number | null
          goals?: number | null
          matches?: number | null
          minutes?: number | null
          own_goals?: number | null
          player_id?: number | null
          points?: number | null
          red_cards?: number | null
          season?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistika_igralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_season_stats_izracun: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          competition_id: number | null
          goals: number | null
          matches: number | null
          minutes: number | null
          own_goals: number | null
          player_id: number | null
          points: number | null
          red_cards: number | null
          season: string | null
          yellow_cards: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      player_standings: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          competition_id: number | null
          form: number | null
          full_name: string | null
          goals: number | null
          id: number | null
          last_round: number | null
          matches: number | null
          minutes: number | null
          owners: number | null
          points: number | null
          points_per_match: number | null
          points_per_value: number | null
          position: string | null
          position_source: string | null
          rank: number | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          value: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      position_confidence: {
        Row: {
          players: number | null
          position_source: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      position_prior_leader: {
        Row: {
          leader_position: string | null
          leader_score: number | null
          player_id: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_priors_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      position_vote_counts: {
        Row: {
          player_id: number | null
          position: string | null
          votes: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      position_vote_weights: {
        Row: {
          player_id: number | null
          position: string | null
          votes: number | null
          weight: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      pozicije_v_cakanju: {
        Row: {
          competition_id: number | null
          full_name: string | null
          glasov: number | null
          izglasovana: string | null
          player_id: number | null
          prag: number | null
          team_id: number | null
          trenutna: string | null
          utez: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      prihodnje_tekme: {
        Row: {
          competition_id: number | null
          doma: boolean | null
          match_id: number | null
          opponent_id: number | null
          opponent_logo: string | null
          opponent_name: string | null
          opponent_short: string | null
          played_on: string | null
          round_id: number | null
          round_number: number | null
          season: string | null
          team_id: number | null
        }
        ComputedFields: never
        Relationships: []
      }
      sezone: {
        Row: {
          competition_id: number | null
          krogov: number | null
          odigranih: number | null
          season: string | null
          tekoca: boolean | null
          zadnji_dan: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      stevilo_ekip_lig: {
        Row: {
          competition_id: number | null
          ekip: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
      voter_position_accuracy: {
        Row: {
          correct: number | null
          resolved: number | null
          voter_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "position_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zadnji_odigrani_krog: {
        Row: {
          competition_id: number | null
          id: number | null
          number: number | null
          played_on: string | null
          season: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
        ]
      }
    }
    Functions: {
      adaptivni_prag: {
        Args: { p_player_id: number; p_position: string }
        Returns: number
      }
      admin_anonimiziraj_igralca: {
        Args: { p_player_ids: number[] }
        Returns: number
      }
      admin_ista_oseba: {
        Args: { p_player_id: number }
        Returns: {
          full_name: string
          id: number
          klub: string
          liga: string
          po_sifri: boolean
        }[]
      }
      admin_nastavi_poznavalca: {
        Args: { p_competition_id?: number; p_user_id: string }
        Returns: undefined
      }
      admin_odloci_prosnjo: {
        Args: { p_id: number; p_odlocitev: string }
        Returns: undefined
      }
      admin_preracunaj_krog: {
        Args: { p_round_id: number }
        Returns: undefined
      }
      admin_prosnje_poznavalcev: {
        Args: Record<PropertyKey, never>
        Returns: {
          competition_id: number
          competition_name: string
          created_at: string
          display_name: string
          email: string
          glasov: number
          id: number
          sporocilo: string
          team_id: number
          team_name: string
          user_id: string
          vloga: string
        }[]
      }
      admin_rast_lig: {
        Args: { p_tednov?: number }
        Returns: {
          aktivnih: number
          competition_id: number
          ekip: number
          federation: string
          name: string
          novih: number
          slug: string
          teden: string
        }[]
      }
      admin_sponzorji: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          claim: string
          competition_id: number
          country_id: number
          doseg_ime: string
          ends_on: string
          federation_id: number
          id: number
          klikov: number
          logo_url: string
          mesta: string[]
          name: string
          opomba: string
          prikazov: number
          slika_url: string
          starts_on: string
          url: string
          utez: number
        }[]
      }
      admin_sponzorji_po_mestih: {
        Args: Record<PropertyKey, never>
        Returns: {
          klikov: number
          klikov_7: number
          mesto: string
          prikazov: number
          prikazov_7: number
          sponsor_id: number
        }[]
      }
      admin_tedenska_aktivnost: {
        Args: { p_tednov?: number }
        Returns: {
          aktivnih: number
          glasovalcev: number
          javiteljev: number
          klepetalcev: number
          novih: number
          teden: string
          urejalcev_ekipe: number
          zacetek: string
        }[]
      }
      admin_uporabniki: {
        Args: { p_competition_id?: number }
        Returns: {
          display_name: string
          drzave: string[]
          ekipa_veljavna: boolean
          email: string
          insider_competition_id: number
          is_admin: boolean
          jezik: string
          registered_at: string
          roster_stevilo: number
          team_id: number
          team_name: string
          user_id: string
        }[]
      }
      admin_zivost: {
        Args: Record<PropertyKey, never>
        Returns: {
          aktivnih_30dni: number
          aktivnih_7dni: number
          mini_lig: number
          prijavljenih_7dni: number
          registriranih: number
          v_mini_ligah: number
          z_ekipo: number
          z_veljavno_ekipo: number
        }[]
      }
      anonimizacijski_kljuc: { Args: { p: string }; Returns: string }
      anonimiziraj_igralca: {
        Args: { p_player_id: number; p_razlog?: string }
        Returns: undefined
      }
      anonimiziraj_neaktivne: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      asistenca_odprta: { Args: { p_goal_id: number }; Returns: boolean }
      asistence_odprte_do: { Args: { p_match_id: number }; Returns: string }
      ime_hisnega_lastnika: {
        Args: { p_competition_id: number; p_id: number }
        Returns: string
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      izbrisi_moj_racun: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      izstop_kluba: {
        Args: { p_competition_id: number; p_team_id: number }
        Returns: Json
      }
      je_poznavalec_lige: {
        Args: { p_competition_id: number }
        Returns: boolean
      }
      kandidati_za_opomnik: {
        Args: { p_competition_id: number }
        Returns: {
          display_name: string
          email: string
          email_vklop: boolean
          jezik: string
          push_vklop: boolean
          team_id: number
          user_id: string
        }[]
      }
      kandidati_za_opozorilo: {
        Args: { p_competition_id: number; p_dni?: number }
        Returns: {
          deadline_at: string
          display_name: string
          email: string
          email_vklop: boolean
          push_vklop: boolean
          razlog: string
          round_id: number
          round_number: number
          team_id: number
          team_name: string
          user_id: string
        }[]
      }
      kandidati_za_push_opomnik: {
        Args: { p_competition_id: number }
        Returns: {
          deadline_at: string
          display_name: string
          email: string
          ima_ekipo: boolean
          jezik: string
          round_id: number
          round_number: number
          team_id: number
          user_id: string
        }[]
      }
      koncani_krogi_mini_lige: {
        Args: { p_liga: number }
        Returns: {
          fantasy_team_id: number
          number: number
          round_id: number
          season: string
        }[]
      }
      krog_je_odigran: { Args: { p_round_id: number }; Returns: boolean }
      lestvica_lige: {
        Args: { p_competition_id: number; p_sezona?: string }
        Returns: {
          dani: number
          forma: string
          grb: string
          ime: string
          kratko: string
          mesto: number
          porazi: number
          prejeti: number
          razlika: number
          remiji: number
          sezona: string
          team_id: number
          tekme: number
          tocke: number
          zmage: number
        }[]
      }
      liga: { Args: { liga: string }; Returns: Json }
      meje_borze: {
        Args: Record<PropertyKey, never>
        Returns: {
          najnizja: number
          najvisja: number
        }[]
      }
      mini_liga_po_kodi: {
        Args: { p_koda: string }
        Returns: {
          ekip: number
          id: number
          name: string
          owner_name: string
        }[]
      }
      najcenejsi_kader: { Args: { p_igralci: Json }; Returns: number }
      najdi_igralca: { Args: { ime: string; liga?: string }; Returns: Json }
      nastavitev_int: {
        Args: { p_key: string; p_privzeto: number }
        Returns: number
      }
      nastavitev_int_za: {
        Args: { p_competition_id: number; p_key: string; p_privzeto: number }
        Returns: number
      }
      nastavitve_tekmovanja: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      navijaci_klubov: {
        Args: { p_competition_id: number }
        Returns: {
          ekipa: string
          fantasy_team_id: number
          grb: string
          klub: string
          klub_kratko: string
          lastnik: string
          mesto: number
          min_navijacev: number
          navijacev: number
          povprecje_krog: number
          povprecje_sezona: number
          round_id: number
          round_number: number
          season: string
          team_id: number
          tocke_krog: number
          tocke_sezona: number
        }[]
      }
      nedavni_opomnik: {
        Args: { p_competition_id: number; p_user_id: string }
        Returns: boolean
      }
      nova_koda_mini_lige: { Args: Record<PropertyKey, never>; Returns: string }
      odjavi_z_zetonom: {
        Args: { p_user: string; p_zeton: string }
        Returns: boolean
      }
      odstrani_hisne_ekipe: { Args: { p_ids: number[] }; Returns: number }
      okno_preracuna_tock: { Args: Record<PropertyKey, never>; Returns: string }
      osvezi_statistiko_igralcev: {
        Args: { p_igralci: number[] }
        Returns: undefined
      }
      osvezi_tocke_krogov: { Args: { p_krogi: number[] }; Returns: undefined }
      osvezi_vse_tocke_krogov: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      osvezi_vso_statistiko_igralcev: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      oznaci_odhod_igralca: {
        Args: { p_odsel: boolean; p_player_id: number }
        Returns: undefined
      }
      podpora_brez_sumnikov: { Args: { t: string }; Returns: string }
      podpora_lige: { Args: { liga: string }; Returns: number[] }
      podpora_najdaljsa_beseda: { Args: { iskanje: string }; Returns: string }
      podpora_ujema: {
        Args: { besedilo: string; iskanje: string }
        Returns: boolean
      }
      poenostavljeno_ime: { Args: { p_ime: string }; Returns: string }
      postava_kroga: {
        Args: { p_round: number; p_team: number }
        Returns: {
          bench_order: number
          is_captain: boolean
          is_starter: boolean
          is_vice: boolean
          player_id: number
          poz: string
        }[]
      }
      potrdi_asistenco: { Args: { p_goal_id: number }; Returns: undefined }
      potrdi_pozicijo: { Args: { p_player_id: number }; Returns: undefined }
      preracunaj_cene: {
        Args: { p_round_id: number }
        Returns: {
          forma: number
          igralec: number
          nova_cena: number
          stara_cena: number
        }[]
      }
      preracunaj_igralca: {
        Args: { p_okno?: string; p_player_id: number }
        Returns: number
      }
      preveri_podatke: {
        Args: Record<PropertyKey, never>
        Returns: {
          kljuc: string
          koliko: number
          opis: string
          primer: string
        }[]
      }
      pridruzi_mini_ligi: {
        Args: { p_ekipa: number; p_koda: string }
        Returns: {
          dodano: boolean
          mini_liga_id: number
        }[]
      }
      pripisi_obranjene_enajstmetrovke: {
        Args: { p_round_id: number }
        Returns: number
      }
      razlog_neveljavne_ekipe: { Args: { p_team_id: number }; Returns: string }
      recompute_round_scores: {
        Args: { p_round_id: number }
        Returns: undefined
      }
      roster_je_veljaven: { Args: { p_team_id: number }; Returns: boolean }
      sem_v_mini_ligi: { Args: { p_liga: number }; Returns: boolean }
      shrani_ekipo: {
        Args: { p_roster: Json; p_team_id: number }
        Returns: Json
      }
      shrani_push_zeton: {
        Args: { p_platforma: string; p_zeton: string }
        Returns: undefined
      }
      skupaj_uporabnikov: { Args: Record<PropertyKey, never>; Returns: number }
      sponzorji_za: {
        Args: { p_competition_id: number; p_mesto?: string }
        Returns: {
          claim: string
          doseg: string
          id: number
          logo_url: string
          name: string
          slika_url: string
          url: string
        }[]
      }
      stanje_lige: { Args: { p_competition_id: number }; Returns: Json }
      stanje_mojih_ekip: {
        Args: Record<PropertyKey, never>
        Returns: {
          brez_tock: boolean
          competition_id: number
          krog: number
          liga: string
          opozorila: Json
          razlog: string
          rok: string
          slug: string
          team_id: number
          team_name: string
          veljavna: boolean
        }[]
      }
      stiki_klubov: {
        Args: {
          p_drzava?: string
          p_iskanje?: string
          p_kljuc: string
          p_omejitev?: number
          p_stanje?: string
          p_team_id?: number
          p_z_besedilom?: boolean
        }
        Returns: Json
      }
      stiki_nastavi: {
        Args: {
          p_email: string
          p_kljuc: string
          p_odgovorni?: string
          p_opomba?: string
          p_stanje?: string
        }
        Returns: Json
      }
      stiki_preveri_kljuc: { Args: { p_kljuc: string }; Returns: undefined }
      stiki_zabelezi: {
        Args: {
          p_drzava?: string
          p_email: string
          p_gmail_nit?: string
          p_kdaj?: string
          p_kljuc: string
          p_klub?: string
          p_liga?: string
          p_opomba?: string
          p_poslal: string
          p_team_id?: number
          p_telo?: string
          p_vrsta: string
          p_zadeva?: string
        }
        Returns: Json
      }
      tedenski_pregled_ekip: {
        Args: { p_competition_id: number }
        Returns: {
          display_name: string
          ekip: number
          ekipa: string
          email: string
          fantasy_team_id: number
          kapetan: string
          kapetan_tocke: number
          krog: number
          mesto: number
          mesto_prej: number
          najboljsi: string
          najboljsi_tocke: number
          najvec: number
          povprecje: number
          round_id: number
          tocke: number
          user_id: string
        }[]
      }
      tedenski_pregled_mini_lige: {
        Args: { p_krog?: number; p_liga: number }
        Returns: Json
      }
      tekme_kluba: { Args: { klub: string; liga?: string }; Returns: Json }
      tekmovanje_id: { Args: { p_slug: string }; Returns: number }
      tekoca_sezona: { Args: { p_datum?: string }; Returns: string }
      tocke_za_nastop:
        | {
            Args: {
              p_assists: number
              p_clean_sheet: boolean
              p_conceded: number
              p_goals: number
              p_minutes: number
              p_own_goals: number
              p_pen_missed: number
              p_pen_saved: number
              p_position: string
              p_red: number
              p_yellow: number
            }
            Returns: number
          }
        | {
            Args: {
              p_assists: number
              p_clean_sheet: boolean
              p_conceded: number
              p_goals: number
              p_minutes: number
              p_own_goals: number
              p_pen_missed: number
              p_pen_saved: number
              p_position: string
              p_pravila: number
              p_red: number
              p_yellow: number
              p_zmaga: boolean
            }
            Returns: number
          }
      tuja_postava: {
        Args: { p_round: number; p_team: number }
        Returns: {
          ime: string
          je_kapetan: boolean
          je_namestnik: boolean
          je_zacetnik: boolean
          klub: string
          mnozitelj: number
          player_id: number
          pozicija: string
          tocke: number
        }[]
      }
      ucinkovita_postava: {
        Args: { p_round: number; p_team: number }
        Returns: {
          mnozitelj: number
          player_id: number
        }[]
      }
      ustvari_hisno_ekipo: {
        Args: {
          p_competition_id: number
          p_ime: string
          p_owner: string
          p_roster: Json
        }
        Returns: number
      }
      ustvari_mini_ligo: {
        Args: { p_ekipa?: number; p_ime: string }
        Returns: {
          code: string
          id: number
        }[]
      }
      uveljavi_cene: { Args: { p_round_id: number }; Returns: number }
      uveljavi_pozicije: { Args: Record<PropertyKey, never>; Returns: number }
      uveljavi_zapadle_cene: { Args: { p_okno?: string }; Returns: number }
      vklopi_ligo_sredi_sezone: { Args: { p_slug: string }; Returns: Json }
      voter_weight: { Args: { p_voter_id: string }; Returns: number }
      vrh_drzave: {
        Args: { p_drzava: string; p_koliko?: number }
        Returns: {
          competition_short: string
          competition_slug: string
          full_name: string
          kategorija: string
          mesto: number
          minutes: number
          player_id: number
          position: string
          season: string
          team_logo: string
          team_name: string
          team_short: string
          tekem: number
          vrednost: number
        }[]
      }
      vrh_klubov_drzave: {
        Args: {
          p_drzava: string
          p_koliko?: number
          p_na_krog?: boolean
          p_najmanj_krogov?: number
        }
        Returns: {
          competition_short: string
          competition_slug: string
          goli: number
          igralcev: number
          krogov: number
          mesto: number
          na_krog: number
          season: string
          team_id: number
          team_logo: string
          team_name: string
          team_short: string
          tocke: number
        }[]
      }
      zabelezi_korak: { Args: { p_korak: string }; Returns: undefined }
      zabelezi_obisk: { Args: { p_stran: string }; Returns: undefined }
      zabelezi_sponzorja: {
        Args: {
          p_competition_id?: number
          p_klik?: boolean
          p_mesto?: string
          p_sponsor_id: number
        }
        Returns: undefined
      }
      zakleni_krog: { Args: { p_round_id: number }; Returns: number }
      zakleni_zapadle_kroge: { Args: { p_okno?: string }; Returns: number }
      zaprosi_za_poznavalca: {
        Args: {
          p_competition_id: number
          p_sporocilo?: string
          p_team_id: number
          p_vloga: string
        }
        Returns: number
      }
      zeton_odjave: { Args: { p_user: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

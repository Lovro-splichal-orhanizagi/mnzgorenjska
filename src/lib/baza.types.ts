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
          red_card_minute: number | null
          red_cards: number
          shirt_number: number | null
          started: boolean
          team_id: number
          yellow_cards: number
        }
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
          red_card_minute?: number | null
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
          red_card_minute?: number | null
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
          {
            foreignKeyName: "appearances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["drzava"]
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
          value: Json
        }
        Insert: {
          competition_id: number
          key: string
          value: Json
        }
        Update: {
          competition_id?: number
          key?: string
          value?: Json
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
          {
            foreignKeyName: "competition_settings_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          active: boolean
          country_id: number
          date_only_deadline_policy: string | null
          federation_id: number | null
          id: number
          mnzg_liga: string | null
          name: string
          prvi_fantasy_krog: number
          rok_pomak_ur: number
          sezona_koledarska: boolean
          short_name: string
          slug: string
          sort_order: number
          source: string
          source_league_code: string | null
          source_policy: string | null
          vir_ime: string | null
          vir_url: string | null
        }
        Insert: {
          active?: boolean
          country_id: number
          date_only_deadline_policy?: string | null
          federation_id?: number | null
          id?: never
          mnzg_liga?: string | null
          name: string
          prvi_fantasy_krog?: number
          rok_pomak_ur?: number
          sezona_koledarska?: boolean
          short_name: string
          slug: string
          sort_order?: number
          source: string
          source_league_code?: string | null
          source_policy?: string | null
          vir_ime?: string | null
          vir_url?: string | null
        }
        Update: {
          active?: boolean
          country_id?: number
          date_only_deadline_policy?: string | null
          federation_id?: number | null
          id?: never
          mnzg_liga?: string | null
          name?: string
          prvi_fantasy_krog?: number
          rok_pomak_ur?: number
          sezona_koledarska?: boolean
          short_name?: string
          slug?: string
          sort_order?: number
          source?: string
          source_league_code?: string | null
          source_policy?: string | null
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
            foreignKeyName: "email_log_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
        ]
      }
      klub_dodani_igralci: {
        Row: {
          competition_id: number
          created_at: string
          full_name: string
          id: number
          odstranjen_at: string | null
          player_id: number | null
          sezona: string
          team_id: number
          user_id: string | null
        }
        Insert: {
          competition_id: number
          created_at?: string
          full_name: string
          id?: never
          odstranjen_at?: string | null
          player_id?: number | null
          sezona: string
          team_id: number
          user_id?: string | null
        }
        Update: {
          competition_id?: number
          created_at?: string
          full_name?: string
          id?: never
          odstranjen_at?: string | null
          player_id?: number | null
          sezona?: string
          team_id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klub_dodani_igralci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_dodani_igralci_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      klub_predstavitev: {
        Row: {
          facebook: string | null
          instagram: string | null
          opis: string | null
          spletna_stran: string | null
          team_id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          facebook?: string | null
          instagram?: string | null
          opis?: string | null
          spletna_stran?: string | null
          team_id: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          facebook?: string | null
          instagram?: string | null
          opis?: string | null
          spletna_stran?: string | null
          team_id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klub_predstavitev_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_predstavitev_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_predstavitev_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_predstavitev_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klub_predstavitev_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klub_predstavitev_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          posiljatelj: string | null
          poslji_od: string | null
          stanje: string
          team_id: number | null
          updated_at: string
          updated_by: string | null
          v_vrsti: boolean
          vir_url: string | null
          zadnji_mail_at: string | null
        }
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
          posiljatelj?: string | null
          poslji_od?: string | null
          stanje?: string
          team_id?: number | null
          updated_at?: string
          updated_by?: string | null
          v_vrsti?: boolean
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
          posiljatelj?: string | null
          poslji_od?: string | null
          stanje?: string
          team_id?: number | null
          updated_at?: string
          updated_by?: string | null
          v_vrsti?: boolean
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
          {
            foreignKeyName: "klub_stik_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
      klubski_racuni: {
        Row: {
          created_at: string
          id: number
          klub_stik_id: number | null
          preklical: string | null
          preklican_at: string | null
          team_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          klub_stik_id?: number | null
          preklical?: string | null
          preklican_at?: string | null
          team_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          klub_stik_id?: number | null
          preklical?: string | null
          preklican_at?: string | null
          team_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klubski_racuni_klub_stik_id_fkey"
            columns: ["klub_stik_id"]
            isOneToOne: false
            referencedRelation: "klub_stik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_racuni_preklical_fkey"
            columns: ["preklical"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_racuni_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_racuni_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_racuni_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_racuni_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_racuni_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_racuni_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      klubski_zahtevki: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          dokaz_url: string | null
          email: string
          id: number
          klub_stik_id: number | null
          opomba: string | null
          razlog: string | null
          status: string
          team_id: number | null
          user_id: string
          vloga: string | null
          vrsta: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dokaz_url?: string | null
          email: string
          id?: never
          klub_stik_id?: number | null
          opomba?: string | null
          razlog?: string | null
          status?: string
          team_id?: number | null
          user_id: string
          vloga?: string | null
          vrsta: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dokaz_url?: string | null
          email?: string
          id?: never
          klub_stik_id?: number | null
          opomba?: string | null
          razlog?: string | null
          status?: string
          team_id?: number | null
          user_id?: string
          vloga?: string | null
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "klubski_zahtevki_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_klub_stik_id_fkey"
            columns: ["klub_stik_id"]
            isOneToOne: false
            referencedRelation: "klub_stik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "klubski_zahtevki_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kode_vabil: {
        Row: {
          created_at: string
          koda: string
          user_id: string
        }
        Insert: {
          created_at?: string
          koda: string
          user_id: string
        }
        Update: {
          created_at?: string
          koda?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kode_vabil_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
          away_goals: number | null
          away_team_id: number
          home_goals: number | null
          home_team_id: number
          id: number
          import_warnings: string[]
          imported_at: string | null
          kontumacija: boolean
          played_on: string | null
          round_id: number
          source_phase: string | null
          source_round: number | null
          source_url: string | null
          statistics_reason: string | null
          statistics_status: string
          vir_brez_izida: boolean
          zapisnik_id: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id: number
          home_goals?: number | null
          home_team_id: number
          id?: never
          import_warnings?: string[]
          imported_at?: string | null
          kontumacija?: boolean
          played_on?: string | null
          round_id: number
          source_phase?: string | null
          source_round?: number | null
          source_url?: string | null
          statistics_reason?: string | null
          statistics_status?: string
          vir_brez_izida?: boolean
          zapisnik_id?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: number
          home_goals?: number | null
          home_team_id?: number
          id?: never
          import_warnings?: string[]
          imported_at?: string | null
          kontumacija?: boolean
          played_on?: string | null
          round_id?: number
          source_phase?: string | null
          source_round?: number | null
          source_url?: string | null
          statistics_reason?: string | null
          statistics_status?: string
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
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
      mini_liga_dvoboji: {
        Row: {
          created_at: string
          ekipa_a: number
          ekipa_b: number | null
          id: number
          krog: number
          mini_liga_id: number
          sezona: string
        }
        Insert: {
          created_at?: string
          ekipa_a: number
          ekipa_b?: number | null
          id?: never
          krog: number
          mini_liga_id: number
          sezona: string
        }
        Update: {
          created_at?: string
          ekipa_a?: number
          ekipa_b?: number | null
          id?: never
          krog?: number
          mini_liga_id?: number
          sezona?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_a_fkey"
            columns: ["ekipa_a"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "fantasy_team_budget"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "fantasy_team_standings"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "fantasy_team_wealth"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_ekipa_b_fkey"
            columns: ["ekipa_b"]
            isOneToOne: false
            referencedRelation: "mini_liga_lestvica"
            referencedColumns: ["fantasy_team_id"]
          },
          {
            foreignKeyName: "mini_liga_dvoboji_mini_liga_id_fkey"
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
          competition_id: number | null
          created_at: string
          id: number
          javna: boolean
          javna_zaklenjena_at: string | null
          name: string
          opis: string | null
          owner_id: string
          saljive_nagrade: boolean
        }
        Insert: {
          code: string
          competition_id?: number | null
          created_at?: string
          id?: never
          javna?: boolean
          javna_zaklenjena_at?: string | null
          name: string
          opis?: string | null
          owner_id: string
          saljive_nagrade?: boolean
        }
        Update: {
          code?: string
          competition_id?: number | null
          created_at?: string
          id?: never
          javna?: boolean
          javna_zaklenjena_at?: string | null
          name?: string
          opis?: string | null
          owner_id?: string
          saljive_nagrade?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mini_lige_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_lige_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_lige_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "mini_lige_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_lige_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      napovedi: {
        Row: {
          away_goals: number
          created_at: string
          home_goals: number
          match_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away_goals: number
          created_at?: string
          home_goals: number
          match_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away_goals?: number
          created_at?: string
          home_goals?: number
          match_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "napovedi_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "napovedi_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "napovedi_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      narocila_znack: {
        Row: {
          created_at: string
          id: number
          ime_na_znacki: string
          naslov: Json
          opomba: string | null
          player_id: number | null
          poslano_at: string | null
          postnina: string | null
          preverjeni_racun_id: number | null
          status: string
          stripe_checkout_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ime_na_znacki: string
          naslov: Json
          opomba?: string | null
          player_id?: number | null
          poslano_at?: string | null
          postnina?: string | null
          preverjeni_racun_id?: number | null
          status?: string
          stripe_checkout_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ime_na_znacki?: string
          naslov?: Json
          opomba?: string | null
          player_id?: number | null
          poslano_at?: string | null
          postnina?: string | null
          preverjeni_racun_id?: number | null
          status?: string
          stripe_checkout_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narocila_znack_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "narocila_znack_preverjeni_racun_id_fkey"
            columns: ["preverjeni_racun_id"]
            isOneToOne: false
            referencedRelation: "preverjeni_racuni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narocila_znack_user_id_fkey"
            columns: ["user_id"]
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
      objave: {
        Row: {
          dejstva: Json
          discord_at: string | null
          drzava: string | null
          fb_povezava: string | null
          glasba: string | null
          id: number
          ig_povezava: string | null
          jezik: string
          liga: string | null
          mediji: string[]
          mejnik: number | null
          napaka: string | null
          napis: string
          napis_vir: string
          objava_ob: string
          objavljeno_at: string | null
          slot: string
          stanje: string
          teden: string
          ustavi_zeton_hash: string | null
          ustvarjeno: string
          vrsta: string | null
        }
        Insert: {
          dejstva: Json
          discord_at?: string | null
          drzava?: string | null
          fb_povezava?: string | null
          glasba?: string | null
          id?: never
          ig_povezava?: string | null
          jezik: string
          liga?: string | null
          mediji?: string[]
          mejnik?: number | null
          napaka?: string | null
          napis: string
          napis_vir?: string
          objava_ob: string
          objavljeno_at?: string | null
          slot: string
          stanje?: string
          teden: string
          ustavi_zeton_hash?: string | null
          ustvarjeno?: string
          vrsta?: string | null
        }
        Update: {
          dejstva?: Json
          discord_at?: string | null
          drzava?: string | null
          fb_povezava?: string | null
          glasba?: string | null
          id?: never
          ig_povezava?: string | null
          jezik?: string
          liga?: string | null
          mediji?: string[]
          mejnik?: number | null
          napaka?: string | null
          napis?: string
          napis_vir?: string
          objava_ob?: string
          objavljeno_at?: string | null
          slot?: string
          stanje?: string
          teden?: string
          ustavi_zeton_hash?: string | null
          ustvarjeno?: string
          vrsta?: string | null
        }
        Relationships: []
      }
      odjava_kljuc: {
        Row: {
          id: number
          kljuc: string
        }
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
      omejitve_uporabnikov: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          odstranjena_at: string | null
          razlog: string
          user_id: string
          velja_do: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          odstranjena_at?: string | null
          razlog: string
          user_id: string
          velja_do: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          odstranjena_at?: string | null
          razlog?: string
          user_id?: string
          velja_do?: string
        }
        Relationships: [
          {
            foreignKeyName: "omejitve_uporabnikov_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omejitve_uporabnikov_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      piva: {
        Row: {
          created_at: string
          id: number
          ime: string | null
          piv: number
          skrito: boolean
          sporocilo: string | null
          test: boolean
          vir: string
          vracilo: boolean
          zunanji_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ime?: string | null
          piv?: number
          skrito?: boolean
          sporocilo?: string | null
          test?: boolean
          vir?: string
          vracilo?: boolean
          zunanji_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ime?: string | null
          piv?: number
          skrito?: boolean
          sporocilo?: string | null
          test?: boolean
          vir?: string
          vracilo?: boolean
          zunanji_id?: string | null
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
          dodal_klub_at: string | null
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
        Insert: {
          active?: boolean
          anonimiziran_at?: string | null
          anonimiziran_razlog?: string | null
          competition_id?: number
          dodal_klub_at?: string | null
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
          dodal_klub_at?: string | null
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
        ]
      }
      ponovne_cene: {
        Row: {
          competition_id: number
          created_at: string
          id: number
          izid: string | null
          nova_cena: number | null
          odloceno_at: string | null
          odlocil: string | null
          opomba: string | null
          placano_at: string | null
          player_id: number
          podlaga: Json | null
          predlog_at: string | null
          stanje: string
          stara_cena: number | null
          stripe_placilo: string | null
          stripe_seja: string | null
          user_id: string | null
        }
        Insert: {
          competition_id: number
          created_at?: string
          id?: never
          izid?: string | null
          nova_cena?: number | null
          odloceno_at?: string | null
          odlocil?: string | null
          opomba?: string | null
          placano_at?: string | null
          player_id: number
          podlaga?: Json | null
          predlog_at?: string | null
          stanje?: string
          stara_cena?: number | null
          stripe_placilo?: string | null
          stripe_seja?: string | null
          user_id?: string | null
        }
        Update: {
          competition_id?: number
          created_at?: string
          id?: never
          izid?: string | null
          nova_cena?: number | null
          odloceno_at?: string | null
          odlocil?: string | null
          opomba?: string | null
          placano_at?: string | null
          player_id?: number
          podlaga?: Json | null
          predlog_at?: string | null
          stanje?: string
          stara_cena?: number | null
          stripe_placilo?: string | null
          stripe_seja?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponovne_cene_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "ponovne_cene_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_odlocil_fkey"
            columns: ["odlocil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponovne_cene_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ponovne_cene_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popravki_podatkov: {
        Row: {
          asistent_id: number | null
          competition_id: number
          created_at: string
          gol_avtogol: boolean | null
          gol_enajstmetrovka: boolean | null
          gol_minuta: number | null
          gol_strelec_id: number | null
          id: number
          match_id: number | null
          odloceno_at: string | null
          odlocil: string | null
          opomba: string | null
          player_id: number | null
          pozicija: string | null
          razlog: string | null
          stanje: string
          team_id: number
          user_id: string
          vrsta: string
        }
        ComputedFields: never
        Insert: {
          asistent_id?: number | null
          competition_id: number
          created_at?: string
          gol_avtogol?: boolean | null
          gol_enajstmetrovka?: boolean | null
          gol_minuta?: number | null
          gol_strelec_id?: number | null
          id?: never
          match_id?: number | null
          odloceno_at?: string | null
          odlocil?: string | null
          opomba?: string | null
          player_id?: number | null
          pozicija?: string | null
          razlog?: string | null
          stanje?: string
          team_id: number
          user_id: string
          vrsta: string
        }
        Update: {
          asistent_id?: number | null
          competition_id?: number
          created_at?: string
          gol_avtogol?: boolean | null
          gol_enajstmetrovka?: boolean | null
          gol_minuta?: number | null
          gol_strelec_id?: number | null
          id?: never
          match_id?: number | null
          odloceno_at?: string | null
          odlocil?: string | null
          opomba?: string | null
          player_id?: number | null
          pozicija?: string | null
          razlog?: string | null
          stanje?: string
          team_id?: number
          user_id?: string
          vrsta?: string
        }
        Relationships: [
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_asistent_id_fkey"
            columns: ["asistent_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_gol_strelec_id_fkey"
            columns: ["gol_strelec_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_odlocil_fkey"
            columns: ["odlocil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "competition_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_reports_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "popravki_podatkov_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "popravki_podatkov_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      potrditve_soigralcev: {
        Row: {
          created_at: string
          player_id: number
          user_id: string
          zahtevek_id: number
        }
        Insert: {
          created_at?: string
          player_id: number
          user_id: string
          zahtevek_id: number
        }
        Update: {
          created_at?: string
          player_id?: number
          user_id?: string
          zahtevek_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrditve_soigralcev_zahtevek_id_fkey"
            columns: ["zahtevek_id"]
            isOneToOne: false
            referencedRelation: "zahtevki_igralca"
            referencedColumns: ["id"]
          },
        ]
      }
      povabila: {
        Row: {
          created_at: string
          kvalificiran_at: string | null
          povabil: string
          povabljeni: string
        }
        Insert: {
          created_at?: string
          kvalificiran_at?: string | null
          povabil: string
          povabljeni: string
        }
        Update: {
          created_at?: string
          kvalificiran_at?: string | null
          povabil?: string
          povabljeni?: string
        }
        Relationships: [
          {
            foreignKeyName: "povabila_povabil_fkey"
            columns: ["povabil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povabila_povabljeni_fkey"
            columns: ["povabljeni"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      povezani_igralci: {
        Row: {
          created_at: string
          player_id: number
          povezal: string | null
          zahtevek_id: number
        }
        Insert: {
          created_at?: string
          player_id: number
          povezal?: string | null
          zahtevek_id: number
        }
        Update: {
          created_at?: string
          player_id?: number
          povezal?: string | null
          zahtevek_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povezani_igralci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "povezani_igralci_povezal_fkey"
            columns: ["povezal"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "povezani_igralci_zahtevek_id_fkey"
            columns: ["zahtevek_id"]
            isOneToOne: false
            referencedRelation: "zahtevki_igralca"
            referencedColumns: ["id"]
          },
        ]
      }
      pozicije_klub_cakajo: {
        Row: {
          created_at: string
          player_id: number
          position: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          player_id: number
          position: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          player_id?: number
          position?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pozicije_klub_cakajo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pozicije_klub_dnevnik: {
        Row: {
          created_at: string
          id: number
          novo: string
          player_id: number
          staro: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          novo: string
          player_id: number
          staro?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          novo?: string
          player_id?: number
          staro?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pozicije_klub_dnevnik_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "poznavalec_prosnje_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "poznavalec_prosnje_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
      preverjeni_racuni: {
        Row: {
          created_at: string
          id: number
          odpoved_pravici: boolean | null
          player_id: number
          star_vsaj_18: boolean | null
          status: string
          stripe_checkout_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent: string | null
          stripe_preklic: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
          ustvaril: string | null
          velja_do: string | null
          vir: string
          znesek_pravice: number | null
        }
        Insert: {
          created_at?: string
          id?: never
          odpoved_pravici?: boolean | null
          player_id: number
          star_vsaj_18?: boolean | null
          status?: string
          stripe_checkout_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent?: string | null
          stripe_preklic?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
          ustvaril?: string | null
          velja_do?: string | null
          vir: string
          znesek_pravice?: number | null
        }
        Update: {
          created_at?: string
          id?: never
          odpoved_pravici?: boolean | null
          player_id?: number
          star_vsaj_18?: boolean | null
          status?: string
          stripe_checkout_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent?: string | null
          stripe_preklic?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
          ustvaril?: string | null
          velja_do?: string | null
          vir?: string
          znesek_pravice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preverjeni_racuni_ustvaril_fkey"
            columns: ["ustvaril"]
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
      prijave_mini_lig: {
        Row: {
          created_at: string
          id: number
          mini_liga_id: number
          razlog: string | null
          resena_at: string | null
          resil: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          mini_liga_id: number
          razlog?: string | null
          resena_at?: string | null
          resil?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          mini_liga_id?: number
          razlog?: string | null
          resena_at?: string | null
          resil?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prijave_mini_lig_mini_liga_id_fkey"
            columns: ["mini_liga_id"]
            isOneToOne: false
            referencedRelation: "mini_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prijave_mini_lig_resil_fkey"
            columns: ["resil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prijave_mini_lig_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prijave_profila_igralca: {
        Row: {
          created_at: string
          id: number
          razlog: string | null
          resena_at: string | null
          resil: string | null
          user_id: string
          zahtevek_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          razlog?: string | null
          resena_at?: string | null
          resil?: string | null
          user_id: string
          zahtevek_id: number
        }
        Update: {
          created_at?: string
          id?: never
          razlog?: string | null
          resena_at?: string | null
          resil?: string | null
          user_id?: string
          zahtevek_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "prijave_profila_igralca_resil_fkey"
            columns: ["resil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prijave_profila_igralca_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prijave_profila_igralca_zahtevek_id_fkey"
            columns: ["zahtevek_id"]
            isOneToOne: false
            referencedRelation: "zahtevki_igralca"
            referencedColumns: ["id"]
          },
        ]
      }
      profil_igralca: {
        Row: {
          facebook: string | null
          fotografija: string | null
          instagram: string | null
          opis: string | null
          player_id: number
          skrij_ime: boolean
          tiktok: string | null
          updated_at: string
          vzdevek: string | null
        }
        Insert: {
          facebook?: string | null
          fotografija?: string | null
          instagram?: string | null
          opis?: string | null
          player_id: number
          skrij_ime?: boolean
          tiktok?: string | null
          updated_at?: string
          vzdevek?: string | null
        }
        Update: {
          facebook?: string | null
          fotografija?: string | null
          instagram?: string | null
          opis?: string | null
          player_id?: number
          skrij_ime?: boolean
          tiktok?: string | null
          updated_at?: string
          vzdevek?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      profil_igralca_plus: {
        Row: {
          barva: string | null
          opis: string | null
          pasica: string | null
          player_id: number
          splet: string | null
          sporocilo: string | null
          statistika: string | null
          tekma_id: number | null
          updated_at: string
          x: string | null
          youtube: string | null
        }
        Insert: {
          barva?: string | null
          opis?: string | null
          pasica?: string | null
          player_id: number
          splet?: string | null
          sporocilo?: string | null
          statistika?: string | null
          tekma_id?: number | null
          updated_at?: string
          x?: string | null
          youtube?: string | null
        }
        Update: {
          barva?: string | null
          opis?: string | null
          pasica?: string | null
          player_id?: number
          splet?: string | null
          sporocilo?: string | null
          statistika?: string | null
          tekma_id?: number | null
          updated_at?: string
          x?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_tekma_id_fkey"
            columns: ["tekma_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "profil_igralca_plus_tekma_id_fkey"
            columns: ["tekma_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_barva: number | null
          avatar_ikona: string | null
          brez_opomnikov: boolean
          brez_push: boolean
          created_at: string
          display_name: string
          display_name_changed_at: string | null
          id: string
          insider_competition_id: number | null
          insider_team_id: number | null
          is_admin: boolean
          javni_profil: boolean
          navijam_team_id: number | null
        }
        Insert: {
          avatar_barva?: number | null
          avatar_ikona?: string | null
          brez_opomnikov?: boolean
          brez_push?: boolean
          created_at?: string
          display_name: string
          display_name_changed_at?: string | null
          id: string
          insider_competition_id?: number | null
          insider_team_id?: number | null
          is_admin?: boolean
          javni_profil?: boolean
          navijam_team_id?: number | null
        }
        Update: {
          avatar_barva?: number | null
          avatar_ikona?: string | null
          brez_opomnikov?: boolean
          brez_push?: boolean
          created_at?: string
          display_name?: string
          display_name_changed_at?: string | null
          id?: string
          insider_competition_id?: number | null
          insider_team_id?: number | null
          is_admin?: boolean
          javni_profil?: boolean
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
            foreignKeyName: "profiles_insider_competition_id_fkey"
            columns: ["insider_competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "profiles_insider_team_id_fkey"
            columns: ["insider_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
          {
            foreignKeyName: "profiles_navijam_team_id_fkey"
            columns: ["navijam_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
          datum_ocenjen: boolean
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
        Insert: {
          borza_po_starem?: boolean
          borza_z_odmikom?: boolean
          competition_id?: number
          datum_ocenjen?: boolean
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
          datum_ocenjen?: boolean
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      samodejni_poznavalci: {
        Row: {
          competition_id: number
          glasov: number
          odvzel: string | null
          odvzeto_at: string | null
          podeljeno_at: string
          pravilnih: number
          razlog: string | null
          user_id: string
        }
        Insert: {
          competition_id: number
          glasov: number
          odvzel?: string | null
          odvzeto_at?: string | null
          podeljeno_at?: string
          pravilnih: number
          razlog?: string | null
          user_id: string
        }
        Update: {
          competition_id?: number
          glasov?: number
          odvzel?: string | null
          odvzeto_at?: string | null
          podeljeno_at?: string
          pravilnih?: number
          razlog?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "samodejni_poznavalci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samodejni_poznavalci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samodejni_poznavalci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "samodejni_poznavalci_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samodejni_poznavalci_odvzel_fkey"
            columns: ["odvzel"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samodejni_poznavalci_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
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
            foreignKeyName: "sponsor_stats_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
      stripe_dogodki: {
        Row: {
          id: string
          obdelano_at: string | null
          prejeto_at: string
          tip: string
        }
        Insert: {
          id: string
          obdelano_at?: string | null
          prejeto_at?: string
          tip: string
        }
        Update: {
          id?: string
          obdelano_at?: string | null
          prejeto_at?: string
          tip?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          country_id: number
          id: number
          logo_url: string | null
          logo_vir: string | null
          name: string
          short_name: string | null
        }
        Insert: {
          country_id: number
          id?: never
          logo_url?: string | null
          logo_vir?: string | null
          name: string
          short_name?: string | null
        }
        Update: {
          country_id?: number
          id?: never
          logo_url?: string | null
          logo_vir?: string | null
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
      testerji: {
        Row: {
          created_at: string
          dodal: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dodal?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dodal?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testerji_dodal_fkey"
            columns: ["dodal"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testerji_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      trgovine_dnevno: {
        Row: {
          dan: string
          novi: number | null
          skupaj: number
          trgovina: string
        }
        Insert: {
          dan: string
          novi?: number | null
          skupaj: number
          trgovina: string
        }
        Update: {
          dan?: string
          novi?: number | null
          skupaj?: number
          trgovina?: string
        }
        Relationships: []
      }
      trgovine_stanje: {
        Row: {
          mejnik: number | null
          posodobljeno: string
          stanje: string | null
          trgovina: string
        }
        Insert: {
          mejnik?: number | null
          posodobljeno?: string
          stanje?: string | null
          trgovina: string
        }
        Update: {
          mejnik?: number | null
          posodobljeno?: string
          stanje?: string | null
          trgovina?: string
        }
        Relationships: []
      }
      uradne_odsotnosti: {
        Row: {
          created_at: string
          id: number
          klub_potrdil: string | null
          klub_potrdil_at: string | null
          ni_drzalo_datum: string | null
          ni_drzalo_match_id: number | null
          od: string
          opomba: string | null
          player_id: number
          sezona: string
          status: string
          user_id: string
          vrnitev: string | null
          vrsta: string
          zahtevek_id: number
          zaprto_at: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          klub_potrdil?: string | null
          klub_potrdil_at?: string | null
          ni_drzalo_datum?: string | null
          ni_drzalo_match_id?: number | null
          od: string
          opomba?: string | null
          player_id: number
          sezona: string
          status?: string
          user_id: string
          vrnitev?: string | null
          vrsta: string
          zahtevek_id: number
          zaprto_at?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          klub_potrdil?: string | null
          klub_potrdil_at?: string | null
          ni_drzalo_datum?: string | null
          ni_drzalo_match_id?: number | null
          od?: string
          opomba?: string | null
          player_id?: number
          sezona?: string
          status?: string
          user_id?: string
          vrnitev?: string | null
          vrsta?: string
          zahtevek_id?: number
          zaprto_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uradne_odsotnosti_klub_potrdil_fkey"
            columns: ["klub_potrdil"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_ni_drzalo_match_id_fkey"
            columns: ["ni_drzalo_match_id"]
            isOneToOne: false
            referencedRelation: "match_assist_status"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_ni_drzalo_match_id_fkey"
            columns: ["ni_drzalo_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_zahtevek_id_fkey"
            columns: ["zahtevek_id"]
            isOneToOne: false
            referencedRelation: "zahtevki_igralca"
            referencedColumns: ["id"]
          },
        ]
      }
      zadrzani_padci: {
        Row: {
          created_at: string
          odsotnost_id: number
          player_id: number
          round_id: number
          uveljavljeno_at: string | null
          znesek: number
        }
        Insert: {
          created_at?: string
          odsotnost_id: number
          player_id: number
          round_id: number
          uveljavljeno_at?: string | null
          znesek: number
        }
        Update: {
          created_at?: string
          odsotnost_id?: number
          player_id?: number
          round_id?: number
          uveljavljeno_at?: string | null
          znesek?: number
        }
        Relationships: [
          {
            foreignKeyName: "zadrzani_padci_odsotnost_id_fkey"
            columns: ["odsotnost_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_odsotnost_id_fkey"
            columns: ["odsotnost_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zadrzani_padci_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "fantasy_round_points_izracun"
            referencedColumns: ["round_id"]
          },
          {
            foreignKeyName: "zadrzani_padci_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "naslednji_krog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zadrzani_padci_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "zadnji_odigrani_krog"
            referencedColumns: ["id"]
          },
        ]
      }
      zahtevki_igralca: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          dokaz_url: string | null
          id: number
          klubu_na: string | null
          klubu_poslano_at: string | null
          note: string | null
          obvescen_at: string | null
          player_id: number
          potrdil: string | null
          spor: boolean
          star_vsaj_16: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dokaz_url?: string | null
          id?: never
          klubu_na?: string | null
          klubu_poslano_at?: string | null
          note?: string | null
          obvescen_at?: string | null
          player_id: number
          potrdil?: string | null
          spor?: boolean
          star_vsaj_16?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          dokaz_url?: string | null
          id?: never
          klubu_na?: string | null
          klubu_poslano_at?: string | null
          note?: string | null
          obvescen_at?: string | null
          player_id?: number
          potrdil?: string | null
          spor?: boolean
          star_vsaj_16?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zahtevki_igralca_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zelje_lig: {
        Row: {
          competition_id: number | null
          created_at: string
          drzava: string
          email: string | null
          id: number
          ime_lige: string
          jezik: string | null
          obvescen_at: string | null
          poskusov: number
          user_id: string | null
        }
        Insert: {
          competition_id?: number | null
          created_at?: string
          drzava: string
          email?: string | null
          id?: never
          ime_lige: string
          jezik?: string | null
          obvescen_at?: string | null
          poskusov?: number
          user_id?: string | null
        }
        Update: {
          competition_id?: number | null
          created_at?: string
          drzava?: string
          email?: string | null
          id?: never
          ime_lige?: string
          jezik?: string | null
          obvescen_at?: string | null
          poskusov?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zelje_lig_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zelje_lig_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zelje_lig_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "lestvica_drzavna"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "zelje_lig_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zelje_lig_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zetoni_prevzema: {
        Row: {
          created_at: string
          expires_at: string
          hash: string
          id: number
          klub_stik_id: number | null
          odlocitev: string | null
          porabljen_at: string | null
          zahtevek_id: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hash: string
          id?: never
          klub_stik_id?: number | null
          odlocitev?: string | null
          porabljen_at?: string | null
          zahtevek_id: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          hash?: string
          id?: never
          klub_stik_id?: number | null
          odlocitev?: string | null
          porabljen_at?: string | null
          zahtevek_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "zetoni_prevzema_klub_stik_id_fkey"
            columns: ["klub_stik_id"]
            isOneToOne: false
            referencedRelation: "klub_stik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zetoni_prevzema_zahtevek_id_fkey"
            columns: ["zahtevek_id"]
            isOneToOne: false
            referencedRelation: "zahtevki_igralca"
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
          sezona_koledarska: boolean | null
          short_name: string | null
          slug: string | null
          sort_order: number | null
          source: string | null
          source_league_code: string | null
          vir_ime: string | null
          vir_url: string | null
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_round_standings: {
        Row: {
          competition_id: number | null
          fantasy_team_id: number | null
          owner_id: string | null
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_team_standings: {
        Row: {
          best_round: number | null
          competition_id: number | null
          fantasy_team_id: number | null
          hisna: boolean | null
          owner_id: string | null
          owner_name: string | null
          owner_registered_at: string | null
          rounds_played: number | null
          team_created_at: string | null
          team_name: string | null
          total_points: number | null
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      fotografije_igralcev: {
        Row: {
          fotografija: string | null
          player_id: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "chat_messages_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["drzava"]
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
          owner_id: string | null
          owner_name: string | null
          points_per_round: number | null
          rounds_played: number | null
          team_name: string | null
          total_points: number | null
        }
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
          statistics_reason: string | null
          statistics_status: string | null
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
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
          owner_id: string | null
          owner_name: string | null
          points_per_round: number | null
          rounds_played: number | null
          team_name: string | null
          total_points: number | null
        }
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      objava_lige: {
        Row: {
          drzava: string | null
          id: number | null
          ime: string | null
          kratko: string | null
          slug: string | null
        }
        Relationships: []
      }
      odsotni_igralci: {
        Row: {
          competition_id: number | null
          content: string | null
          created_at: string | null
          kind: string | null
          player_id: number | null
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
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
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
          {
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
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
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
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
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
          },
        ]
      }
      position_confidence: {
        Row: {
          players: number | null
          position_source: string | null
        }
        Relationships: []
      }
      position_prior_leader: {
        Row: {
          leader_position: string | null
          leader_score: number | null
          player_id: number | null
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
      position_vote_counts: {
        Row: {
          player_id: number | null
          position: string | null
          votes: number | null
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
        ]
      }
      position_vote_weights: {
        Row: {
          player_id: number | null
          position: string | null
          votes: number | null
          weight: number | null
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
        ]
      }
      potrjeni_igralci: {
        Row: {
          glavni_player_id: number | null
          player_id: number | null
          potrdil: string | null
          potrjen_at: string | null
        }
        Relationships: []
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
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
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "uradne_odsotnosti_view"
            referencedColumns: ["team_id"]
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
        Relationships: []
      }
      sezone: {
        Row: {
          competition_id: number | null
          krogov: number | null
          odigranih: number | null
          season: string | null
          statistics_complete_matches: number | null
          statistics_unavailable_matches: number | null
          tekoca: boolean | null
          zadnji_dan: string | null
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      stevilo_ekip_lig: {
        Row: {
          competition_id: number | null
          ekip: number | null
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
            foreignKeyName: "fantasy_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
        ]
      }
      uradne_odsotnosti_view: {
        Row: {
          cena_zamrznjena: boolean | null
          competition_id: number | null
          created_at: string | null
          glavni_player_id: number | null
          id: number | null
          klub_potrdil: boolean | null
          moje: boolean | null
          ni_drzalo_datum: string | null
          od: string | null
          opomba: string | null
          player_id: number | null
          player_name: string | null
          status: string | null
          team_id: number | null
          team_logo: string | null
          team_name: string | null
          team_short: string | null
          vrnitev: string | null
          vrsta: string | null
          zaprto_at: string | null
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
            foreignKeyName: "players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uradne_odsotnosti_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "krog_najboljsi"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "player_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "player_season_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "player_standings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtevki_igralca_player_id_fkey"
            columns: ["glavni_player_id"]
            isOneToOne: false
            referencedRelation: "pozicije_v_cakanju"
            referencedColumns: ["player_id"]
          },
        ]
      }
      voter_position_accuracy: {
        Row: {
          correct: number | null
          resolved: number | null
          voter_id: string | null
        }
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
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "objava_lige"
            referencedColumns: ["id"]
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
      admin_dodaj_pivo: {
        Args: {
          p_datum?: string
          p_ime: string
          p_piv: number
          p_sporocilo?: string
        }
        Returns: number
      }
      admin_dodeli_preverjen: {
        Args: { p_player_id: number; p_velja_do?: string; p_vir?: string }
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
      admin_izbrisi_pivo: { Args: { p_id: number }; Returns: undefined }
      admin_klubski_igralci_brez_nastopa: {
        Args: never
        Returns: {
          aktiven: boolean
          dodan: string
          igralec: number
          ime: string
          klub: string
          lastnikov: number
          liga: string
        }[]
      }
      admin_klubski_racuni: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: number
          preklican_at: string
          team_id: number
          team_name: string
          user_id: string
        }[]
      }
      admin_klubski_zahtevki: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          dokaz_url: string
          email: string
          id: number
          opomba: string
          racunov_kluba: number
          razlog: string
          status: string
          team_id: number
          team_name: string
          user_id: string
          vloga: string
          vrsta: string
        }[]
      }
      admin_narocila_znack: {
        Args: never
        Returns: {
          created_at: string
          id: number
          ime_na_znacki: string
          kupec: string
          naslov: Json
          opomba: string
          player_id: number
          player_name: string
          poslano_at: string
          postnina: string
          pravica_status: string
          status: string
        }[]
      }
      admin_nastavi_narocilo_znacke: {
        Args: { p_id: number; p_opomba?: string; p_status: string }
        Returns: undefined
      }
      admin_nastavi_poznavalca: {
        Args: { p_competition_id?: number; p_user_id: string }
        Returns: undefined
      }
      admin_nastavi_testerja: {
        Args: { p_dodaj?: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_odloci_klubski_zahtevek: {
        Args: {
          p_id: number
          p_potrdi: boolean
          p_preklici_racun?: number
          p_razlog?: string
          p_team_id?: number
        }
        Returns: undefined
      }
      admin_odloci_mini_ligo: {
        Args: { p_liga: number; p_skrij: boolean }
        Returns: undefined
      }
      admin_odloci_prosnjo: {
        Args: { p_id: number; p_odlocitev: string }
        Returns: undefined
      }
      admin_odloci_zahtevek: {
        Args: { p_id: number; p_note?: string; p_odlocitev: string }
        Returns: undefined
      }
      admin_odstrani_fotografijo: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      admin_odstrani_klubskega_igralca: {
        Args: { p_player_id: number }
        Returns: string
      }
      admin_odstrani_omejitev: { Args: { p_id: number }; Returns: undefined }
      admin_odvzemi_preverjen: { Args: { p_id: number }; Returns: undefined }
      admin_omeji_uporabnika: {
        Args: { p_dni: number; p_razlog: string; p_user_id: string }
        Returns: number
      }
      admin_omejitve: {
        Args: never
        Returns: {
          avtor: string
          created_at: string
          id: number
          ime: string
          razlog: string
          user_id: string
          velja_do: string
        }[]
      }
      admin_piva: {
        Args: never
        Returns: {
          created_at: string
          id: number
          ime: string
          piv: number
          skrito: boolean
          sporocilo: string
          test: boolean
          vir: string
          vracilo: boolean
          zunanji_id: string
        }[]
      }
      admin_ponastavi_grb: { Args: { p_team_id: number }; Returns: undefined }
      admin_ponovna_cena_potrdi: { Args: { p_id: number }; Returns: string }
      admin_ponovna_cena_zavrni: {
        Args: { p_id: number; p_opomba?: string }
        Returns: undefined
      }
      admin_ponovna_cena_znova: { Args: { p_id: number }; Returns: undefined }
      admin_ponovne_cene: {
        Args: never
        Returns: {
          id: number
          igralec: string
          izid: string
          kdaj: string
          kupec: string
          liga: string
          nova: number
          opomba: string
          player_id: number
          podlaga: Json
          stanje: string
          stara: number
          stripe_placilo: string
          v_roku: boolean
        }[]
      }
      admin_potrjeni_poznavalci: {
        Args: never
        Returns: {
          competition_id: number
          competition_name: string
          display_name: string
          email: string
          glasov: number
          obseg: string
          potrjeno_at: string
          team_id: number
          team_name: string
          user_id: string
          velja: boolean
          vloga: string
        }[]
      }
      admin_povabila_po_uporabniku: {
        Args: never
        Returns: {
          brez_ekipe: number
          povabil: number
          user_id: string
        }[]
      }
      admin_povabila_skupaj: {
        Args: never
        Returns: {
          registracij: number
          z_ekipo: number
        }[]
      }
      admin_povezi_igralca: {
        Args: { p_player_id: number; p_povezi?: boolean; p_zahtevek_id: number }
        Returns: undefined
      }
      admin_povezi_zelje: {
        Args: { p_ids: number[]; p_slug: string }
        Returns: undefined
      }
      admin_predlogi_povezav: {
        Args: { p_zahtevek_id: number }
        Returns: {
          full_name: string
          ista_sifra: boolean
          isti_klub: boolean
          klub_v_ligi: boolean
          liga: string
          liga_slug: string
          player_id: number
          povezan: boolean
          team_name: string
          zaseden: boolean
        }[]
      }
      admin_preklici_klubski_racun: {
        Args: { p_id: number }
        Returns: undefined
      }
      admin_preracunaj_krog: {
        Args: { p_round_id: number }
        Returns: undefined
      }
      admin_preverjeni: {
        Args: never
        Returns: {
          aktivna: boolean
          dodeljena_at: string
          drug_uporabnik: boolean
          email: string
          liga: string
          player_id: number
          player_name: string
          pravica_id: number
          prosilec: string
          status: string
          team_name: string
          user_id: string
          velja: boolean
          velja_do: string
          vir: string
          zahtevek_id: number
        }[]
      }
      admin_prevzem_zeton_za_klub: {
        Args: { p_na?: string; p_zahtevek_id: number }
        Returns: {
          drzava: string
          email: string
          expires_at: string
          igralec: string
          klub: string
          klub_stik_id: number
          liga: string
          liga_slug: string
          prosilec: string
          prosilec_email: string
          zahtevek_id: number
          zeton: string
        }[]
      }
      admin_prijave_mini_lig: {
        Args: never
        Returns: {
          ekip: number
          ime: string
          javna: boolean
          lastnik: string
          lastnik_id: string
          liga: string
          mini_liga_id: number
          opis: string
          prijav: number
          razlogi: string[]
          zadnja: string
        }[]
      }
      admin_prosnje_poznavalcev: {
        Args: never
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
      admin_rast: { Args: { p_od?: string }; Returns: Json }
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
      admin_samodejni_poznavalci: {
        Args: never
        Returns: {
          competition_id: number
          display_name: string
          glasov: number
          liga: string
          odvzel_admin: boolean
          odvzeto_at: string
          podeljeno_at: string
          pravilnih: number
          razlog: string
          user_id: string
        }[]
      }
      admin_scout_skrij: { Args: { p_player_ids: number[] }; Returns: number }
      admin_skrij_pivo: {
        Args: { p_id: number; p_skrito: boolean }
        Returns: undefined
      }
      admin_sponzorji: {
        Args: never
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
        Args: never
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
      admin_testerji: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          user_id: string
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
      admin_zahtevki_igralcev: {
        Args: never
        Returns: {
          competition_id: number
          created_at: string
          decided_at: string
          dokaz_url: string
          email: string
          id: number
          klub_email: string
          klubu_na: string
          klubu_poslano_at: string
          liga: string
          player_id: number
          player_name: string
          potrdil: string
          potrditev: number
          povezanih: number
          prijav: number
          pripeljanih: number
          prosilec: string
          razlogi: string[]
          spor: boolean
          star_vsaj_16: boolean
          status: string
          team_name: string
          user_id: string
          vrsta: string
        }[]
      }
      admin_zelje_lig: {
        Args: never
        Returns: {
          aktivna: boolean
          competition_id: number
          drzava: string
          ids: number[]
          imena: string[]
          liga: string
          odprtih: number
          slug: string
          zadnja: string
          zelj: number
        }[]
      }
      admin_zivost: {
        Args: never
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
      anonimiziraj_neaktivne: { Args: never; Returns: number }
      apply_fcf_current_target_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_hashes: Json
        }
        Returns: Json
      }
      apply_fcf_historical_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_hashes: Json
        }
        Returns: Json
      }
      apply_historical_statistics_policy: {
        Args: {
          p_competition_id: number
          p_entries: Json
          p_policy_id: string
          p_policy_sha256: string
        }
        Returns: Json
      }
      apply_mfa_challenge_reviewed_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_sha: string
        }
        Returns: Json
      }
      apply_mfa_nl_reviewed_bootstrap: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_competition_id: number
          p_main_sha: string
          p_policy_sha: string
        }
        Returns: Json
      }
      apply_mfa_reviewed_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_sha: string
        }
        Returns: Json
      }
      apply_mlsz_historical_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_hashes: Json
        }
        Returns: Json
      }
      apply_reviewed_existing_cleanup: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_sha: string
          p_slug: string
        }
        Returns: Json
      }
      asistenca_odprta: { Args: { p_goal_id: number }; Returns: boolean }
      asistence_odprte_do: { Args: { p_match_id: number }; Returns: string }
      begin_reviewed_existing_prices: {
        Args: { p_main_sha: string; p_policy_sha: string; p_slug: string }
        Returns: Json
      }
      check_fcf_current_target: {
        Args: { p_activate?: boolean; p_rollout_text: string; p_sha256: string }
        Returns: Json
      }
      check_hns_women_release: {
        Args: { p_activate?: boolean; p_manifest: string; p_sha256: string }
        Returns: Json
      }
      check_mfa_challenge_reviewed_release: {
        Args: {
          p_activate?: boolean
          p_expected_preview_sha?: string
          p_main_sha: string
        }
        Returns: Json
      }
      check_mfa_nl_reviewed_release: {
        Args: {
          p_activate?: boolean
          p_competition_id: number
          p_contract_sha: string
          p_expected_preview_sha?: string
          p_main_sha: string
        }
        Returns: Json
      }
      check_mfa_reviewed_release: {
        Args: {
          p_activate?: boolean
          p_expected_preview_sha?: string
          p_main_sha: string
        }
        Returns: Json
      }
      check_reviewed_existing_release: {
        Args: {
          p_activate?: boolean
          p_expected_preview_sha?: string
          p_main_sha: string
          p_policy_sha: string
          p_slug: string
        }
        Returns: Json
      }
      clani_napovedi_mini_lige: {
        Args: { p_liga: number }
        Returns: {
          competition_id: number
          competition_short: string
          sezona: string
          user_id: string
        }[]
      }
      dan_kroga: { Args: { p_round_id: number }; Returns: string }
      dribl_reserve_player_ids: {
        Args: { p_source_ids: string[] }
        Returns: {
          reg_st: number
          source_id: string
        }[]
      }
      dvoboji_ekipe: {
        Args: { p_ekipa: number; p_krog?: number }
        Returns: {
          izid: string
          koncan: boolean
          krog: number
          mini_liga: string
          mini_liga_id: number
          nasprotnik: string
          nasprotnik_id: number
          tocke: number
          tocke_nasprotnika: number
        }[]
      }
      dvoboji_mini_lige: {
        Args: { p_krog?: number; p_liga: number }
        Returns: Json
      }
      fcf_historical_six_apply: {
        Args: {
          p_before_image_text: string
          p_before_sha: string
          p_main_sha: string
          p_policy_hashes: Json
        }
        Returns: Json
      }
      fcf_historical_six_prepare: {
        Args: { p_main_sha: string; p_policy_hashes: Json }
        Returns: Json
      }
      fcf_historical_six_restore: {
        Args: { p_before_sha: string }
        Returns: Json
      }
      fcf_six_current_target_check: {
        Args: { p_activate?: boolean; p_rollout_text: string; p_sha256: string }
        Returns: Json
      }
      fcf_six_current_target_import: {
        Args: { p_rollout_text: string; p_sha256: string }
        Returns: Json
      }
      fcf_six_current_target_inventory: {
        Args: { p_privacy_keys: string[]; p_slug: string }
        Returns: Json
      }
      fcf_six_current_target_pricing: {
        Args: { p_slug: string }
        Returns: Json
      }
      fcf_six_current_target_receipt: {
        Args: { p_slug: string }
        Returns: Json
      }
      fussball_reserve_player_ids: {
        Args: { p_source_ids: string[] }
        Returns: {
          reg_st: number
          source_id: string
        }[]
      }
      get_fcf_current_target_inventory: {
        Args: { p_privacy_keys: string[]; p_slug: string }
        Returns: Json
      }
      get_fcf_target_pricing_snapshot: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_hns_women_import_context: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      get_installed_fcf_six_statistics_markers: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      get_installed_historical_statistics_markers: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      get_mfa_challenge_reviewed_receipt: { Args: never; Returns: Json }
      get_mfa_nl_reviewed_bootstrap_receipt: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      get_mfa_nl_reviewed_release_receipt: {
        Args: { p_competition_id: number }
        Returns: Json
      }
      get_mfa_nl_reviewed_source_contract: {
        Args: { p_competition_id: number; p_contract_sha: string }
        Returns: Json
      }
      get_mfa_nl_reviewed_source_state: {
        Args: {
          p_competition_id: number
          p_contract_sha: string
          p_main_sha: string
        }
        Returns: Json
      }
      get_mfa_reviewed_receipt: { Args: never; Returns: Json }
      get_mlsz_reviewed_history_receipt: { Args: never; Returns: Json }
      get_reviewed_existing_cleanup_receipt: {
        Args: { p_slug: string }
        Returns: Json
      }
      gol_popravka: {
        Args: {
          p_avtogol: boolean
          p_enajstmetrovka: boolean
          p_match_id: number
          p_minuta: number
          p_strelec: number
          p_team_id: number
        }
        Returns: number
      }
      ima_klubski_racun: { Args: { p_team_id: number }; Returns: boolean }
      ime_hisnega_lastnika: {
        Args: { p_competition_id: number; p_id: number }
        Returns: string
      }
      ime_za_primerjavo: { Args: { p: string }; Returns: string }
      import_fcf_current_target: {
        Args: { p_rollout_text: string; p_sha256: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      isci_igralce: {
        Args: { iskanje: string; omejitev?: number }
        Returns: {
          aktiven: boolean
          cena: number
          drzava: string
          full_name: string
          id: number
          klub: string
          liga: string
          liga_aktivna: boolean
          liga_ime: string
          podobno: boolean
          pozicija: string
        }[]
      }
      isci_klube: {
        Args: { iskanje: string; omejitev?: number }
        Returns: {
          drzava: string
          grb: string
          id: number
          ime: string
          kratko: string
          liga: string
        }[]
      }
      izbrisi_moj_racun: { Args: never; Returns: undefined }
      izid_znan: {
        Args: { p_imported_at: string; p_statistics_status: string }
        Returns: boolean
      }
      izidi_dvobojev: {
        Args: { p_liga: number; p_sezona: string }
        Returns: {
          ekipa: number
          koncan: boolean
          krog: number
          nasprotnik: number
          prva: boolean
          tocke: number
          tocke_nasprotnika: number
        }[]
      }
      izstop_kluba: {
        Args: { p_competition_id: number; p_team_id: number }
        Returns: Json
      }
      javna_piva: {
        Args: never
        Returns: {
          created_at: string
          ime: string
          piv: number
          sporocilo: string
        }[]
      }
      javne_mini_lige: {
        Args: { p_iskanje?: string; p_omejitev?: number; p_tekmovanje: number }
        Returns: {
          created_at: string
          ekip: number
          id: number
          name: string
          opis: string
          owner_id: string
          owner_name: string
          sem_clan: boolean
        }[]
      }
      javni_profil: { Args: { p_id: string }; Returns: Json }
      je_klubski_racun: {
        Args: { p_team_id: number; p_user: string }
        Returns: boolean
      }
      je_lastnik_profila: { Args: { p_player_id: number }; Returns: boolean }
      je_mladinska_liga: {
        Args: { p_competition_id: number }
        Returns: boolean
      }
      je_mladinski_slug: { Args: { p_slug: string }; Returns: boolean }
      je_omejen: { Args: { p_uid: string }; Returns: boolean }
      je_potrjen_igralec: { Args: { p_player_id: number }; Returns: boolean }
      je_poznavalec_lige: {
        Args: { p_competition_id: number }
        Returns: boolean
      }
      je_preverjen: { Args: { p_player_id: number }; Returns: boolean }
      kandidati_za_dobrodoslico: {
        Args: { p_najvec?: number }
        Returns: {
          display_name: string
          drzava: string
          email: string
          email_vklop: boolean
          jezik: string
          push_vklop: boolean
          user_id: string
        }[]
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
      kandidati_za_opomnik_brez_ekipe: {
        Args: { p_najvec?: number }
        Returns: {
          competition_id: number
          display_name: string
          email: string
          email_vklop: boolean
          jezik: string
          liga_drzava: string
          liga_oznaka: string
          liga_slug: string
          push_vklop: boolean
          rok: string
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
      kandidati_za_pivo_7dni: {
        Args: { p_najvec?: number }
        Returns: {
          competition_id: number
          display_name: string
          email: string
          liga_drzava: string
          liga_oznaka: string
          liga_slug: string
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
      kandidati_za_zivo_ligo: {
        Args: { p_najvec?: number }
        Returns: {
          display_name: string
          email: string
          id: number
          jezik: string
          liga_drzava: string
          liga_oznaka: string
          liga_slug: string
        }[]
      }
      klub_cakajoce_pozicije: {
        Args: { p_team_id: number }
        Returns: {
          igralec: number
          od: string
          pozicija: string
        }[]
      }
      klub_dodaj_igralca: {
        Args: {
          p_competition_id: number
          p_ime: string
          p_position: string
          p_priimek: string
          p_st?: number
        }
        Returns: number
      }
      klub_dodani: {
        Args: { p_team_id: number }
        Returns: {
          aktiven: boolean
          dnevnik: number
          dodan: string
          dres: number
          igralec: number
          ime: string
          liga: string
          nastopov: number
          odstranjen: string
          pozicija: string
        }[]
      }
      klub_nastavi_grb: {
        Args: { p_pot: string; p_team_id: number }
        Returns: string
      }
      klub_nastavi_pozicijo: {
        Args: { p_player_id: number; p_position: string }
        Returns: undefined
      }
      klub_odsotnosti: {
        Args: { p_team_id: number }
        Returns: {
          id: number
          od: string
          opomba: string
          player_id: number
          player_name: string
          potrjena: boolean
          vrnitev: string
          vrsta: string
        }[]
      }
      klub_odstrani_igralca: { Args: { p_player_id: number }; Returns: string }
      klub_potrdi_odsotnost: { Args: { p_id: number }; Returns: undefined }
      klub_preklici_pozicijo: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      klub_sme_pisati_grb: { Args: { p_name: string }; Returns: boolean }
      klub_uredi_predstavitev: {
        Args: {
          p_facebook: string
          p_instagram: string
          p_opis: string
          p_spletna_stran: string
          p_team_id: number
        }
        Returns: undefined
      }
      klub_ustvari_racun: {
        Args: { p_stik_id: number; p_team_id: number; p_user: string }
        Returns: number
      }
      klub_v_vrsto: {
        Args: {
          p_email: string
          p_stik_id: number
          p_team_id: number
          p_user: string
          p_vrsta: string
        }
        Returns: undefined
      }
      klub_zaprosi_za_naslov: {
        Args: {
          p_dokaz_url: string
          p_opomba?: string
          p_team_id: number
          p_vloga: string
        }
        Returns: number
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
      krog_dvoboja_koncan: { Args: { p_round_id: number }; Returns: boolean }
      krog_je_odigran: { Args: { p_round_id: number }; Returns: boolean }
      krogi_napovedi_lige: {
        Args: { p_tekmovanje: number }
        Returns: {
          krog: number
          round_id: number
        }[]
      }
      krogi_napovedi_mini_lige: {
        Args: { p_liga: number }
        Returns: {
          krog: number
        }[]
      }
      lestvica_javne_mini_lige: {
        Args: { p_liga: number }
        Returns: {
          competition_short: string
          fantasy_team_id: number
          federation_short: string
          owner_id: string
          owner_name: string
          points_per_round: number
          rounds_played: number
          team_name: string
          total_points: number
        }[]
      }
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
      lestvica_napovedi_lige: {
        Args: { p_krog?: number; p_tekmovanje: number }
        Returns: {
          display_name: string
          je_moj: boolean
          mesto: number
          ocenjenih: number
          razpletov: number
          tocke: number
          tocnih: number
        }[]
      }
      lestvica_napovedi_mini_lige: {
        Args: { p_krog?: number; p_liga: number }
        Returns: {
          display_name: string
          ocenjenih: number
          razpletov: number
          tocke: number
          tocnih: number
          user_id: string
        }[]
      }
      liga: { Args: { liga: string }; Returns: Json }
      meje_borze: {
        Args: never
        Returns: {
          najnizja: number
          najvisja: number
        }[]
      }
      mini_liga_glava: {
        Args: { p_liga: number }
        Returns: {
          competition_id: number
          competition_name: string
          competition_short: string
          competition_slug: string
          ekip: number
          id: number
          javna: boolean
          name: string
          opis: string
          owner_id: string
          owner_name: string
          sem_clan: boolean
          sem_lastnik: boolean
          zaklenjena: boolean
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
      moj_klubski_racun: { Args: never; Returns: Json }
      moja_koda_vabila: { Args: never; Returns: string }
      moje_mesto_v_vrsti: {
        Args: never
        Returns: {
          mesto: number
          pripeljanih: number
          v_vrsti: number
          zahtevek_id: number
        }[]
      }
      moje_odprte_napovedi: {
        Args: { p_tekmovanje?: number }
        Returns: {
          away_logo: string
          away_name: string
          away_short: string
          competition_id: number
          competition_short: string
          home_logo: string
          home_name: string
          home_short: string
          krog: number
          match_id: number
          napoved_doma: number
          napoved_gostje: number
          played_on: string
          rok: string
          round_id: number
        }[]
      }
      najcenejsi_kader: { Args: { p_igralci: Json }; Returns: number }
      najdi_igralca: { Args: { ime: string; liga?: string }; Returns: Json }
      napaka_prikaznega_imena: { Args: { p_ime: string }; Returns: string }
      napovedi_mini_lige_krog: {
        Args: { p_krog: number; p_liga: number }
        Returns: {
          away_logo: string
          away_name: string
          away_short: string
          competition_id: number
          competition_short: string
          display_name: string
          home_logo: string
          home_name: string
          home_short: string
          izid_doma: number
          izid_gostje: number
          match_id: number
          napoved_doma: number
          napoved_gostje: number
          played_on: string
          stanje: string
          tocke: number
          user_id: string
        }[]
      }
      nastavi_javnost_mini_lige: {
        Args: {
          p_javna: boolean
          p_liga: number
          p_opis?: string
          p_tekmovanje?: number
        }
        Returns: undefined
      }
      nastavi_saljive_nagrade: {
        Args: { p_liga: number; p_vklop: boolean }
        Returns: boolean
      }
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
      neodvisna_natancnost: {
        Args: never
        Returns: {
          competition_id: number
          glasov: number
          pravilnih: number
          voter_id: string
        }[]
      }
      nova_koda_mini_lige: { Args: never; Returns: string }
      objava_cene: { Args: { p_do: string; p_od: string }; Returns: Json }
      objava_dejstva: {
        Args: { p_do: string; p_drzava: string; p_od: string }
        Returns: Json
      }
      objava_dosezki: { Args: { p_do: string; p_od: string }; Returns: Json }
      objava_drzava: {
        Args: { p_do: string; p_izkljuci?: string[]; p_od: string }
        Returns: Json
      }
      objava_drzave: { Args: { p_do: string; p_od: string }; Returns: Json }
      objava_ekipa_tedna: {
        Args: { p_do: string; p_od: string }
        Returns: Json
      }
      objava_forma: { Args: { p_do: string }; Returns: Json }
      objava_liga: {
        Args: { p_do: string; p_izkljuci?: string[]; p_od: string }
        Returns: Json
      }
      objava_mejnik_dejstva: { Args: never; Returns: Json }
      objava_obramba: { Args: { p_do: string }; Returns: Json }
      objava_stat: { Args: { p_do: string; p_od: string }; Returns: Json }
      objava_strelci: { Args: { p_do: string }; Returns: Json }
      objava_tekme: { Args: { p_do: string; p_od: string }; Returns: Json }
      objavi_uradno_odsotnost: {
        Args: {
          p_od?: string
          p_opomba?: string
          p_player_id: number
          p_vrnitev?: string
          p_vrsta: string
        }
        Returns: number
      }
      ocisti_sporocilo_piva: { Args: { p: string }; Returns: string }
      odjavi_z_zetonom: {
        Args: { p_user: string; p_zeton: string }
        Returns: boolean
      }
      odloci_popravek: {
        Args: { p_id: number; p_razlog?: string; p_sprejmi: boolean }
        Returns: undefined
      }
      odloci_zahtevek_klub: {
        Args: { p_id: number; p_note?: string; p_potrdi: boolean }
        Returns: undefined
      }
      odstrani_hisne_ekipe: { Args: { p_ids: number[] }; Returns: number }
      odstrani_klubskega_igralca: {
        Args: { p_player_id: number }
        Returns: string
      }
      okno_preracuna_tock: { Args: never; Returns: string }
      omejen_do: { Args: { p_uid: string }; Returns: string }
      osvezi_statistiko_igralcev: {
        Args: { p_igralci: number[] }
        Returns: undefined
      }
      osvezi_tocke_krogov: { Args: { p_krogi: number[] }; Returns: undefined }
      osvezi_vse_tocke_krogov: { Args: never; Returns: undefined }
      osvezi_vso_statistiko_igralcev: { Args: never; Returns: undefined }
      oznaci_odhod_igralca: {
        Args: { p_odsel: boolean; p_player_id: number }
        Returns: undefined
      }
      podeli_samodejne_poznavalce: { Args: never; Returns: number }
      podpora_brez_sumnikov: { Args: { t: string }; Returns: string }
      podpora_kandidati: {
        Args: { ime: string; liga: string; nacin: string }
        Returns: {
          active: boolean
          full_name: string
          id: number
          izstopil_at: string
          klub: string
          liga_aktivna: boolean
          liga_ime: string
          pozicija: string
          pozicija_iz: string
          slug: string
          value: number
        }[]
      }
      podpora_lige: { Args: { liga: string }; Returns: number[] }
      podpora_najdaljsa_beseda: { Args: { iskanje: string }; Returns: string }
      podpora_ujema: {
        Args: { besedilo: string; iskanje: string }
        Returns: boolean
      }
      poenostavljeno_ime: { Args: { p_ime: string }; Returns: string }
      ponovna_cena_iz_placila: {
        Args: {
          p_placilo: string
          p_seja: string
          p_user_id: string
          p_zahtevek: number
        }
        Returns: string
      }
      ponovna_cena_ovira: {
        Args: { p_player_id: number; p_razen?: number }
        Returns: string
      }
      ponovna_cena_ovira_igralca: {
        Args: { p_player_id: number }
        Returns: string
      }
      ponovna_cena_predlog: {
        Args: {
          p_izid: string
          p_nova: number
          p_podlaga?: Json
          p_stara: number
          p_zahtevek: number
        }
        Returns: string
      }
      ponovna_cena_pripravi: {
        Args: { p_player_id: number }
        Returns: {
          email: string
          liga: string
          zahtevek: number
        }[]
      }
      ponovna_cena_stanje: { Args: { p_player_id: number }; Returns: Json }
      ponovna_cena_v_roku: {
        Args: { p_competition_id: number }
        Returns: boolean
      }
      ponovne_cene_za_izracun: {
        Args: never
        Returns: {
          liga: string
          player_id: number
          zahtevek: number
        }[]
      }
      popravki_v_pregledu: {
        Args: { p_team_id?: number }
        Returns: {
          asistenca_zdaj: string
          asistent: string
          avtor: string
          created_at: string
          id: number
          igralec: string
          igralec_id: number
          klub: string
          liga: string
          minuta: number
          opomba: string
          pozicija: string
          pozicija_zdaj: string
          strelec: string
          team_id: number
          tekma_id: number
          vir_pozicije: string
          vrsta: string
        }[]
      }
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
      potrdi_soigralca: { Args: { p_id: number }; Returns: string }
      povzetek_napovedi_kroga: {
        Args: { p_round_id: number; p_user_id: string }
        Returns: {
          napovedi: number
          ocenjenih: number
          tocke: number
          tocnih: number
        }[]
      }
      povzetek_rasti: { Args: never; Returns: string }
      preklici_moj_zahtevek: { Args: { p_id: number }; Returns: undefined }
      prepare_dfb_historical_statistics: {
        Args: { p_manifest: string; p_sha256: string }
        Returns: Json
      }
      prepare_fcf_historical_cleanup: {
        Args: { p_main_sha: string; p_policy_hashes: Json }
        Returns: Json
      }
      prepare_hns_women_release: {
        Args: { p_manifest: string; p_sha256: string }
        Returns: Json
      }
      prepare_mfa_challenge_reviewed_cleanup: {
        Args: { p_main_sha: string; p_policy_sha: string }
        Returns: Json
      }
      prepare_mfa_nl_reviewed_bootstrap: {
        Args: {
          p_competition_id: number
          p_main_sha: string
          p_policy_sha: string
        }
        Returns: Json
      }
      prepare_mfa_reviewed_cleanup: {
        Args: { p_main_sha: string; p_policy_sha: string }
        Returns: Json
      }
      prepare_mlsz_historical_cleanup: {
        Args: { p_main_sha: string; p_policy_hashes: Json }
        Returns: Json
      }
      prepare_reviewed_existing_cleanup: {
        Args: { p_main_sha: string; p_policy_sha: string; p_slug: string }
        Returns: Json
      }
      prepovedane_besede: { Args: { p_besedilo: string }; Returns: string }
      prepovedano_besedilo: { Args: { p_besedilo: string }; Returns: string }
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
        Args: never
        Returns: {
          kljuc: string
          koliko: number
          opis: string
          primer: string
        }[]
      }
      preveri_uradne_odsotnosti: { Args: never; Returns: number }
      preverjen_cakajoci_preklici: { Args: never; Returns: string[] }
      preverjen_ime_znacke: { Args: { p_ime: string }; Returns: string }
      preverjen_iz_placila: {
        Args: {
          p_checkout: string
          p_customer: string
          p_ime_na_znacki?: string
          p_naslov?: Json
          p_odpoved: boolean
          p_payment_intent: string
          p_player_id: number
          p_postnina?: string
          p_star_vsaj_18: boolean
          p_subscription: string
          p_user_id: string
          p_velja_do: string
          p_vir: string
          p_znesek?: number
        }
        Returns: string
      }
      preverjen_lahko_velja: {
        Args: { p_glavni: number; p_razen?: number; p_user_id: string }
        Returns: boolean
      }
      preverjen_moja_pravica: {
        Args: { p_player_id: number }
        Returns: {
          velja_do: string
          vir: string
        }[]
      }
      preverjen_moje_narocnine: {
        Args: never
        Returns: {
          stripe_customer_id: string
          velja_do: string
        }[]
      }
      preverjen_narocnina_konec: {
        Args: { p_konec: string; p_subscription: string }
        Returns: number
      }
      preverjen_pocisti_naslove: { Args: never; Returns: number }
      preverjen_podaljsaj: {
        Args: { p_subscription: string; p_velja_do: string }
        Returns: string
      }
      preverjen_preklic_opravljen: {
        Args: { p_subscription: string }
        Returns: undefined
      }
      preverjen_pripravi_nakup: {
        Args: { p_ime_na_znacki?: string; p_player_id: number }
        Returns: {
          email: string
          glavni: number
          ime_na_znacki: string
          liga: string
          stripe_customer_id: string
        }[]
      }
      preverjen_spor_dobljen: {
        Args: { p_payment_intent: string; p_subscription: string }
        Returns: string
      }
      preverjen_vracilo: {
        Args: {
          p_payment_intent: string
          p_spor: boolean
          p_subscription: string
          p_vrnjeno: number
          p_znesek: number
        }
        Returns: string
      }
      preverjen_vrstica_placila: {
        Args: { p_payment_intent: string; p_subscription: string }
        Returns: {
          created_at: string
          id: number
          odpoved_pravici: boolean | null
          player_id: number
          star_vsaj_18: boolean | null
          status: string
          stripe_checkout_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent: string | null
          stripe_preklic: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
          ustvaril: string | null
          velja_do: string | null
          vir: string
          znesek_pravice: number | null
        }
        SetofOptions: {
          from: "*"
          to: "preverjeni_racuni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preverjeni_igralci_za: {
        Args: { p_ids: number[] }
        Returns: {
          player_id: number
          vzdevek: string
        }[]
      }
      preverjeni_na_discord: {
        Args: { p_besedilo: string }
        Returns: undefined
      }
      prevzem_ime_igralca: {
        Args: { p_ime: string; p_polno: string; p_priimek: string }
        Returns: string
      }
      prevzem_je_poznavalec_kluba: {
        Args: { p_player_id: number; p_user: string }
        Returns: boolean
      }
      prevzem_neobvesceni: {
        Args: never
        Returns: {
          drzava: string
          email: string
          igralec: string
          klub: string
          liga: string
          liga_slug: string
          player_id: number
          zahtevek_id: number
        }[]
      }
      prevzem_obvescen: { Args: { p_zahtevek_id: number }; Returns: undefined }
      prevzem_odloci_z_zetonom: {
        Args: { p_potrdi: boolean; p_zeton: string }
        Returns: string
      }
      prevzem_odstrani_fotografije: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      prevzem_odstrani_predstavitev: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      prevzem_potrdi: {
        Args: { p_id: number; p_kdo: string; p_potrdil: string }
        Returns: undefined
      }
      prevzem_preklici: {
        Args: { p_id: number; p_kdo: string; p_note: string }
        Returns: undefined
      }
      prevzem_pripravi_shrambo: { Args: never; Returns: undefined }
      prevzem_sme_brisati_foto: { Args: { p_name: string }; Returns: boolean }
      prevzem_sme_pisati_foto: { Args: { p_name: string }; Returns: boolean }
      prevzem_soigralec: {
        Args: { p_player_id: number; p_user: string }
        Returns: number
      }
      prevzem_zahtevek_igralca: {
        Args: { p_player_id: number }
        Returns: number
      }
      prevzem_zeton_hash: { Args: { p_zeton: string }; Returns: string }
      prevzem_zeton_podatki: {
        Args: { p_zeton: string }
        Returns: {
          dokaz_url: string
          expires_at: string
          igralec: string
          klub: string
          liga: string
          prosilec: string
          prosilec_email: string
          stanje: string
        }[]
      }
      prevzem_zeton_test: {
        Args: { p_zahtevek_id: number }
        Returns: {
          drzava: string
          email: string
          expires_at: string
          igralec: string
          klub: string
          klub_stik_id: number
          liga: string
          liga_slug: string
          prosilec: string
          prosilec_email: string
          zahtevek_id: number
          zeton: string
        }[]
      }
      prevzemi_igralca: {
        Args: {
          p_dokaz_url?: string
          p_player_id: number
          p_star_vsaj_16?: boolean
        }
        Returns: number
      }
      pridruzi_javni_mini_ligi: {
        Args: { p_ekipa: number; p_liga: number }
        Returns: {
          dodano: boolean
          mini_liga_id: number
        }[]
      }
      pridruzi_mini_ligi: {
        Args: { p_ekipa: number; p_koda: string }
        Returns: {
          dodano: boolean
          mini_liga_id: number
        }[]
      }
      prijavi_mini_ligo: {
        Args: { p_liga: number; p_razlog?: string }
        Returns: undefined
      }
      prijavi_popravek: {
        Args: {
          p_asistent_id?: number
          p_goal_id?: number
          p_opomba?: string
          p_player_id?: number
          p_pozicija?: string
          p_vrsta: string
        }
        Returns: string
      }
      prijavi_profil_igralca: {
        Args: { p_player_id: number; p_razlog?: string }
        Returns: undefined
      }
      pripeljanih: { Args: { p_uid: string }; Returns: number }
      pripisi_obranjene_enajstmetrovke: {
        Args: { p_round_id: number }
        Returns: number
      }
      razdeli_zlitega_igralca:
        | { Args: { p_igralec: number; p_pisi?: boolean }; Returns: Json }
        | {
            Args: { p_igralec: number; p_ohrani_klub: number; p_pisi: boolean }
            Returns: Json
          }
      razlog_neveljavne_ekipe: { Args: { p_team_id: number }; Returns: string }
      read_fcf_current_target_receipt: {
        Args: { p_slug: string }
        Returns: Json
      }
      recompute_round_scores: {
        Args: { p_round_id: number }
        Returns: undefined
      }
      reconcile_dfb_current_players: {
        Args: {
          p_manifest: string
          p_plan: string
          p_plan_sha256: string
          p_sha256: string
        }
        Returns: Json
      }
      record_mfa_challenge_reviewed_prices: {
        Args: { p_main_sha: string }
        Returns: Json
      }
      record_mfa_nl_reviewed_import: {
        Args: {
          p_competition_id: number
          p_contract_sha: string
          p_football_sha: string
          p_main_sha: string
        }
        Returns: Json
      }
      record_mfa_nl_reviewed_prices: {
        Args: {
          p_competition_id: number
          p_contract_sha: string
          p_main_sha: string
        }
        Returns: Json
      }
      record_mfa_reviewed_prices: {
        Args: { p_main_sha: string }
        Returns: Json
      }
      record_reviewed_existing_prices: {
        Args: { p_main_sha: string; p_policy_sha: string; p_slug: string }
        Returns: Json
      }
      release_mlsz_reviewed_history: {
        Args: {
          p_activate?: boolean
          p_competition_id: number
          p_main_sha: string
        }
        Returns: Json
      }
      rok_napovedi: { Args: { p_round_id: number }; Returns: string }
      roster_je_veljaven: { Args: { p_team_id: number }; Returns: boolean }
      scout_igralec: { Args: { p_player_id: number }; Returns: Json }
      scout_isci: {
        Args: {
          p_min_minut?: number
          p_od?: number
          p_raven?: string
          p_regije?: number[]
          p_samo_odprti?: boolean
          p_skupina?: string
        }
        Returns: {
          delez_minut: number
          goli_90_pri_nas: number
          ime: string
          klub: string
          liga: string
          minute: number
          odprt_za_prestop: boolean
          percentil: number
          player_id: number
          skupina: string
          zaupanje: number
        }[]
      }
      scout_iz_placila: {
        Args: {
          p_customer: string
          p_obdobje: string
          p_subscription: string
          p_team_id: number
          p_user_id: string
          p_velja_do: string
        }
        Returns: string
      }
      scout_klub: { Args: { p_team_id?: number }; Returns: Json }
      scout_moj_klub: { Args: never; Returns: Json }
      scout_moj_profil: {
        Args: { p_player_id: number }
        Returns: {
          country_id: number
          drzava_odprta: boolean
          kontakt_dovoljen: boolean
          letnik: number
          odprt_za_prestop: boolean
          regije: number[]
          skrit: boolean
        }[]
      }
      scout_narocnina_konec: {
        Args: { p_konec: string; p_subscription: string }
        Returns: string
      }
      scout_opazovani: {
        Args: never
        Returns: {
          dodano: string
          ime: string
          klub: string
          liga: string
          minute: number
          odprt_za_prestop: boolean
          percentil: number
          player_id: number
          skupina: string
        }[]
      }
      scout_opazuj: {
        Args: { p_opazuj: boolean; p_player_id: number }
        Returns: undefined
      }
      scout_podaljsaj: {
        Args: { p_subscription: string; p_velja_do: string }
        Returns: string
      }
      scout_podobni: {
        Args: { p_player_id: number }
        Returns: {
          ime: string
          klub: string
          liga: string
          minute: number
          odprt_za_prestop: boolean
          percentil: number
          player_id: number
          podobnost: number
          skupina: string
        }[]
      }
      scout_portal_kupec: { Args: never; Returns: string }
      scout_preklici_privolitev: {
        Args: { p_player_id: number }
        Returns: undefined
      }
      scout_pripravi_nakup: {
        Args: { p_obdobje: string }
        Returns: {
          email: string
          stripe_customer_id: string
          team_id: number
        }[]
      }
      scout_shrani_privolitev: {
        Args: {
          p_kontakt: boolean
          p_letnik: number
          p_odprt: boolean
          p_player_id: number
          p_regije: number[]
        }
        Returns: undefined
      }
      scout_sprosti_sedez: { Args: { p_user: string }; Returns: undefined }
      scout_ugovor: {
        Args: { p_player_id: number; p_skrij: boolean }
        Returns: undefined
      }
      scout_vrzeli: {
        Args: never
        Returns: {
          ime: string
          liga: string
          player_id: number
          skupina: string
          vrednost: number
          vrsta: string
        }[]
      }
      scout_zacni_preizkus: {
        Args: { p_sprejmem_pogoje: boolean }
        Returns: undefined
      }
      scout_zasedi_sedez: { Args: never; Returns: undefined }
      sem_v_mini_ligi: { Args: { p_liga: number }; Returns: boolean }
      sestavi_dvoboje: {
        Args: { p_krog: number; p_liga: number; p_ob: string; p_sezona: string }
        Returns: number
      }
      sezona_lige: {
        Args: { p_competition_id: number; p_datum?: string }
        Returns: string
      }
      shrani_ekipo: {
        Args: { p_roster: Json; p_team_id: number }
        Returns: Json
      }
      shrani_napoved: {
        Args: { p_doma?: number; p_gostje?: number; p_tekma: number }
        Returns: undefined
      }
      shrani_push_zeton: {
        Args: { p_platforma: string; p_zeton: string }
        Returns: undefined
      }
      skrij_moje_ime: { Args: never; Returns: number }
      skupaj_uporabnikov: { Args: never; Returns: number }
      skupnost_napovedi_kroga: {
        Args: { p_round: number }
        Returns: {
          doma: number
          gostje: number
          match_id: number
          n: number
          remi: number
        }[]
      }
      sme_videti_ekipo: { Args: { p_team: number }; Returns: boolean }
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
        Args: never
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
      stanje_tekme_napovedi: {
        Args: {
          p_brez_izida: boolean
          p_dan: string
          p_kontumacija: boolean
          p_znan: boolean
        }
        Returns: string
      }
      stanje_uradne_odsotnosti: {
        Args: { p_player_id: number }
        Returns: {
          blokiran: boolean
          lastnik: boolean
          najvec: number
          opomini: number
          sezona: string
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
      tocke_napovedi: {
        Args: {
          p_doma: number
          p_gostje: number
          p_izid_doma: number
          p_izid_gostje: number
        }
        Returns: number
      }
      trgovina_admin_boni: { Args: never; Returns: Json }
      trgovina_admin_izdelki: { Args: never; Returns: Json }
      trgovina_admin_motivi: { Args: never; Returns: Json }
      trgovina_admin_narocila: { Args: { p_stanje?: string }; Returns: Json }
      trgovina_admin_narocilo: { Args: { p_id: number }; Returns: Json }
      trgovina_admin_nastavi_stanje: {
        Args: { p_id: number; p_opomba?: string; p_stanje: string }
        Returns: Json
      }
      trgovina_admin_nova_serija: {
        Args: { p_postavke: number[] }
        Returns: Json
      }
      trgovina_admin_poslano: {
        Args: { p_narocilo: number; p_sledilna: string }
        Returns: Json
      }
      trgovina_admin_serija: { Args: { p_id: number }; Returns: Json }
      trgovina_admin_serija_stanje: {
        Args: { p_id: number; p_stanje: string }
        Returns: Json
      }
      trgovina_admin_serije: { Args: never; Returns: Json }
      trgovina_admin_shrani_izdelek: { Args: { p: Json }; Returns: number }
      trgovina_admin_shrani_motiv: { Args: { p: Json }; Returns: number }
      trgovina_admin_shrani_personalizacijo: {
        Args: {
          p_doplacilo: number
          p_izdelek: number
          p_obvezna: boolean
          p_vrsta: string
        }
        Returns: undefined
      }
      trgovina_admin_shrani_razlicico: { Args: { p: Json }; Returns: number }
      trgovina_admin_vsa_narocila: {
        Args: {
          p_iskanje?: string
          p_koliko?: number
          p_od?: number
          p_stanje?: string
        }
        Returns: Json
      }
      trgovina_admin_za_tisk: { Args: never; Returns: Json }
      trgovina_bon_porabljen: { Args: { p_promocija: string }; Returns: string }
      trgovina_bon_poslan: { Args: { p_narocilo: number }; Returns: undefined }
      trgovina_boni_narocila: { Args: { p_narocilo: number }; Returns: Json }
      trgovina_iz_placila: {
        Args: {
          p_checkout: string
          p_ddv: number
          p_dostava: number
          p_dostava_kljuc: string
          p_email: string
          p_ime: string
          p_naslov: Json
          p_payment_intent: string
          p_popust?: number
          p_postavke: number
          p_skupaj: number
        }
        Returns: string
      }
      trgovina_izdelek: { Args: { p_slug: string }; Returns: Json }
      trgovina_katalog: { Args: never; Returns: Json }
      trgovina_moja_narocila: { Args: never; Returns: Json }
      trgovina_moja_postava: { Args: { p_team_id: number }; Returns: Json }
      trgovina_moja_znacka: { Args: never; Returns: Json }
      trgovina_moji_prvaki: { Args: never; Returns: Json }
      trgovina_motivi: { Args: never; Returns: Json }
      trgovina_narocilo_seje: {
        Args: { p_checkout: string; p_odjemalec: string; p_user: string }
        Returns: Json
      }
      trgovina_narocilo_za_posto: { Args: { p_id: number }; Returns: Json }
      trgovina_potekla: { Args: { p_checkout: string }; Returns: string }
      trgovina_pripravi_shrambo: { Args: never; Returns: undefined }
      trgovina_rezerviraj: {
        Args: {
          p_jezik: string
          p_odjemalec: string
          p_postavke: Json
          p_user: string
        }
        Returns: Json
      }
      trgovina_sprosti: { Args: { p_narocilo: number }; Returns: string }
      trgovina_vezi_sejo: {
        Args: { p_checkout: string; p_narocilo: number }
        Returns: undefined
      }
      trgovina_vracilo: { Args: { p_payment_intent: string }; Returns: Json }
      trgovina_zabelezi_bon: {
        Args: {
          p_koda_hash: string
          p_koda_konec: string
          p_postavka: number
          p_stripe_promocija: string
          p_velja_do: string
          p_zaporedje: number
        }
        Returns: string
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
      update_hns_women_round: {
        Args: {
          p_captured_at: string
          p_competition_id: number
          p_fixtures: Json
          p_round: number
          p_source_competition_id: string
          p_source_sha256: string
        }
        Returns: Json
      }
      upsert_unavailable_historical_match: {
        Args: {
          p_competition_id: number
          p_header: Json
          p_policy_id: string
          p_policy_sha256: string
          p_raw_sha256: string
          p_source_match_id: string
        }
        Returns: Json
      }
      uradne_odsotnosti_najvec: { Args: never; Returns: number }
      uradne_odsotnosti_opomini: { Args: { p_user: string }; Returns: number }
      ustavi_objavo: { Args: { p_zeton: string }; Returns: boolean }
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
      uveljavi_klubski_racun: { Args: never; Returns: number }
      uveljavi_popravek: { Args: { p_id: number }; Returns: undefined }
      uveljavi_pozicije: { Args: never; Returns: number }
      uveljavi_zapadle_cene: { Args: { p_okno?: string }; Returns: number }
      varen_vklop_dfb_regije: {
        Args: { p_aktiviraj?: boolean; p_manifest: string; p_sha256: string }
        Returns: Json
      }
      varen_vklop_nemcije: {
        Args: { p_aktiviraj?: boolean; p_manifest: string; p_sha256: string }
        Returns: Json
      }
      vidi_ponovno_ceno: { Args: never; Returns: boolean }
      vidi_preverjene: { Args: never; Returns: boolean }
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
      vrsta_zahtevkov_igralca: {
        Args: never
        Returns: {
          mesto: number
          pripeljanih: number
          user_id: string
          v_vrsti: number
          zahtevek_id: number
        }[]
      }
      zabelezi_korak: { Args: { p_korak: string }; Returns: undefined }
      zabelezi_obisk: { Args: { p_stran: string }; Returns: undefined }
      zabelezi_povabilo: { Args: { p_koda: string }; Returns: boolean }
      zabelezi_sponzorja: {
        Args: {
          p_competition_id?: number
          p_klik?: boolean
          p_mesto?: string
          p_sponsor_id: number
        }
        Returns: undefined
      }
      zahtevki_za_odlocitev: {
        Args: { p_player_id?: number; p_team_id?: number }
        Returns: {
          competition_id: number
          created_at: string
          dokaz_url: string
          id: number
          player_id: number
          player_name: string
          potrditev: number
          prosilec: string
          team_id: number
          vloga: string
          ze_potrdil: boolean
        }[]
      }
      zakleni_krog: { Args: { p_round_id: number }; Returns: number }
      zakleni_zapadle_kroge: { Args: { p_okno?: string }; Returns: number }
      zamenjaj_nastope_tekme: {
        Args: { p_goli?: Json; p_match_id: number; p_nastopi: Json }
        Returns: undefined
      }
      zamrznjena_odsotnost: {
        Args: { p_player_id: number; p_round_id: number }
        Returns: number
      }
      zapri_uradno_odsotnost: { Args: { p_id: number }; Returns: undefined }
      zaprosi_za_poznavalca: {
        Args: {
          p_competition_id: number
          p_sporocilo?: string
          p_team_id: number
          p_vloga: string
        }
        Returns: number
      }
      zelim_ligo: {
        Args: {
          p_competition_id?: number
          p_drzava: string
          p_email?: string
          p_ime: string
          p_jezik?: string
        }
        Returns: undefined
      }
      zelja_lige_poslana: {
        Args: { p_id: number; p_uspeh: boolean }
        Returns: undefined
      }
      zeton_odjave: { Args: { p_user: string }; Returns: string }
      zliti_igralci: {
        Args: { p_liga?: string; p_vir?: string }
        Returns: {
          aktivna: boolean
          ime: string
          klubov: number
          krogov_v_sporu: number
          liga: string
          player_id: number
          preskok: string
          reg_st: number
          vir: string
        }[]
      }
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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

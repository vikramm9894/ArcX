export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Pillar = 'fitness' | 'discipline' | 'mindfulness';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          username?: string | null;
          goal: string;
          focus_pillar: Pillar;
          start_date: string;
          duration_days: number;
          current_streak: number;
          longest_streak: number;
          is_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          username?: string | null;
          goal?: string;
          focus_pillar?: Pillar;
          start_date?: string;
          duration_days?: number;
          current_streak?: number;
          longest_streak?: number;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          username?: string | null;
          goal?: string;
          focus_pillar?: Pillar;
          start_date?: string;
          duration_days?: number;
          current_streak?: number;
          longest_streak?: number;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          pillar: Pillar;
          icon: string | null;
          target_frequency: string;
          is_archived: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          pillar?: Pillar;
          icon?: string | null;
          target_frequency?: string;
          is_archived?: boolean;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          pillar?: Pillar;
          icon?: string | null;
          target_frequency?: string;
          is_archived?: boolean;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'habits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          completed_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          completed_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'habit_logs_habit_id_fkey';
            columns: ['habit_id'];
            isOneToOne: false;
            referencedRelation: 'habits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'habit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          workout_date: string;
          duration_minutes: number;
          intensity: 'low' | 'medium' | 'high' | 'extreme';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          workout_date?: string;
          duration_minutes?: number;
          intensity?: 'low' | 'medium' | 'high' | 'extreme';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          workout_date?: string;
          duration_minutes?: number;
          intensity?: 'low' | 'medium' | 'high' | 'extreme';
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_name: string;
          sets: number;
          reps: number;
          weight_kg: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_name: string;
          sets?: number;
          reps?: number;
          weight_kg?: number;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_name?: string;
          sets?: number;
          reps?: number;
          weight_kg?: number;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          mood_score: number;
          discipline_rating: number;
          reflection_text: string | null;
          gratitude_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date?: string;
          mood_score?: number;
          discipline_rating?: number;
          reflection_text?: string | null;
          gratitude_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          mood_score?: number;
          discipline_rating?: number;
          reflection_text?: string | null;
          gratitude_text?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'journal_entries_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      app_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          key: string;
          name: string;
          pillar: Pillar;
          archetype: string;
          bonus: Json;
          forms: Json;
          created_at: string;
        };
        Insert: {
          key: string;
          name: string;
          pillar: Pillar;
          archetype: string;
          bonus: Json;
          forms: Json;
          created_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          pillar?: Pillar;
          archetype?: string;
          bonus?: Json;
          forms?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          user_id: string;
          character_key: string;
          trophies: number;
          wins: number;
          losses: number;
          energy: number;
          shield_until: string | null;
          atk: number;
          def: number;
          crit: number;
          hp: number;
          level: number;
          lifetime_ep: number;
          last_active_day: string;
          is_bot: boolean;
          hidden: boolean;
          banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          character_key: string;
          trophies?: number;
          wins?: number;
          losses?: number;
          energy?: number;
          shield_until?: string | null;
          atk?: number;
          def?: number;
          crit?: number;
          hp?: number;
          level?: number;
          lifetime_ep?: number;
          last_active_day?: string;
          is_bot?: boolean;
          hidden?: boolean;
          banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          character_key?: string;
          trophies?: number;
          wins?: number;
          losses?: number;
          energy?: number;
          shield_until?: string | null;
          atk?: number;
          def?: number;
          crit?: number;
          hp?: number;
          level?: number;
          lifetime_ep?: number;
          last_active_day?: string;
          is_bot?: boolean;
          hidden?: boolean;
          banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'players_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'players_character_key_fkey';
            columns: ['character_key'];
            isOneToOne: false;
            referencedRelation: 'characters';
            referencedColumns: ['key'];
          },
        ];
      };
      ep_daily: {
        Row: {
          user_id: string;
          day: string;
          habit_ep: number;
          workout_ep: number;
          journal_ep: number;
          total_ep: number;
          energy_granted: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          day?: string;
          habit_ep?: number;
          workout_ep?: number;
          journal_ep?: number;
          total_ep?: number;
          energy_granted?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          day?: string;
          habit_ep?: number;
          workout_ep?: number;
          journal_ep?: number;
          total_ep?: number;
          energy_granted?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ep_daily_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      sync_my_ep: {
        Args: {
          p_day?: string;
        };
        Returns: Json;
      };
      choose_character: {
        Args: {
          p_character_key: string;
        };
        Returns: Json;
      };
      refresh_my_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      global_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: Json;
      };
      my_rank: {
        Args: Record<string, never>;
        Returns: Json;
      };
      around_me: {
        Args: {
          p_n?: number;
        };
        Returns: Json;
      };
      respond_friend_request: {
        Args: {
          p_friendship_id: string;
          p_accept: boolean;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

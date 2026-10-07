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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useSubmitBugReport() {
  return useMutation({
    mutationFn: async (description: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not signed in');
      const { error } = await supabase.from('bug_reports').insert({
        user_id: userData.user.id,
        description,
        app_version: Constants.expoConfig?.version ?? null,
        platform: `${Platform.OS} ${Platform.Version}`,
      });
      if (error) throw error;
    },
  });
}

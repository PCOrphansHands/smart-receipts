import { supabase } from "./supabase";

export const auth = {
  getAuthHeaderValue: async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return "";
    }

    return `Bearer ${session.access_token}`;
  },
  getAuthToken: async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  },
  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },
  signInWithGoogle: async (): Promise<void> => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  }
}

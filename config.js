/*
 * إعداد الاتصال بـ Supabase
 * أنشئ مشروعًا مجانيًا في Supabase ثم ضع:
 * Project URL في SUPABASE_URL
 * Publishable key (أو anon key القديم) في SUPABASE_PUBLISHABLE_KEY
 *
 * لا تضع service_role key هنا أو في أي ملف يصل إلى المتصفح.
 */
window.BAIT_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",
  SITE_URL: window.location.origin + window.location.pathname
};
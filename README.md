# بيت الخبرات القانونية — النسخة المتصلة بـ Supabase

هذه النسخة تحوّل النموذج الأولي إلى منصة ويب فعلية قابلة للنشر، مع:
- Supabase Auth لتسجيل/دخول المستفيدين وإعادة تعيين كلمة المرور.
- PostgreSQL + RLS لحماية البيانات والصلاحيات.
- مساحة مستفيد حقيقية.
- لوحة إدارة منفصلة لا تظهر في التنقل العام.
- إدارة البرامج، الخبراء، المحتوى، الفعاليات، المستفيدين، التسجيلات وطلبات الخدمات.
- المفضلة.
- الشهادات.
- طلبات الخدمات القانونية.
- Supabase Storage للصور والملفات العامة.
- جاهزية للنشر على GitHub Pages أو Vercel.

## مهم قبل النشر

لا يمكن وضع رابط مشروع Supabase ومفتاحه الخاص بك داخل الملف من جهتي لأنهما يخصان مشروعك وحسابك. الملف يحتوي `config.js` جاهزًا؛ المطلوب فقط وضع:
1. Supabase Project URL
2. Supabase Publishable Key

**لا تضع service_role key في `config.js`.**

## 1 — إنشاء Supabase

أنشئ مشروعًا مجانيًا في Supabase، ثم:
- افتح SQL Editor.
- الصق كامل ملف `supabase/schema.sql`.
- نفّذه مرة واحدة.

بعد ذلك:
- Authentication → Providers → Email → فعّل Email/Password.
- Authentication → URL Configuration:
  - Site URL = رابط الموقع النهائي.
  - Redirect URLs = رابط الموقع النهائي.
- أنشئ حساب المدير من واجهة التسجيل.
- من Authentication → Users انسخ UUID لحساب المدير.
- نفّذ في SQL Editor:
  `update public.profiles set role='admin' where id='UUID-المدير';`

## 2 — ربط الواجهة

افتح `config.js` وضع:

```js
window.BAIT_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_KEY",
  SITE_URL: window.location.origin + window.location.pathname
};
```

إذا كان مشروعك يستخدم مفتاح `anon` القديم، يمكن وضعه مكان publishable key.

## 3 — اختبار محلي

لا تفتح `index.html` مباشرة إذا أردت اختبار Auth في بعض المتصفحات. استخدم Static Server:

```bash
python3 -m http.server 5500
```

ثم:
`http://localhost:5500`

أضف هذا الرابط مؤقتًا إلى Redirect URLs في Supabase.

## 4 — النشر على GitHub Pages

ارفع الملفات التالية إلى المستودع:
- index.html
- styles.css
- app.js
- config.js
- README.md
- supabase/schema.sql

ثم من GitHub:
Settings → Pages → Deploy from branch → main → root.

بعد ظهور رابط GitHub Pages:
ضعه في Supabase → Authentication → URL Configuration.

> لأن التطبيق يستخدم Hash Routing مثل `#courses` و`#admin/courses` فلا تحتاج إلى خادم Node أو Build System.

## 5 — النشر على Vercel

اربط مستودع GitHub مع Vercel، واختر المشروع كـ Static Site.
لا تحتاج إلى Build Command.

بعد النشر، أضف رابط Vercel إلى Supabase Redirect URLs.

## 6 — الصلاحيات

الصلاحيات ليست مجرد إخفاء زر الإدارة في JavaScript.

RLS في Supabase هو طبقة الحماية الفعلية:
- user: بياناته وتسجيلاته وطلباته ومفضلاته.
- training_manager: البرامج والتسجيلات والشهادات.
- content_manager: الخبراء والمحتوى والفعاليات.
- services_manager: طلبات الخدمات.
- admin: الإدارة الكاملة.

لإنشاء مدير أول:
1. أنشئ الحساب من المنصة.
2. عيّن دوره من SQL كما هو موضح أعلاه.

## 7 — الملفات

يوجد Bucket باسم `bait-assets` للصور والملفات العامة.

إذا كانت لديك ملفات حساسة مثل مستندات قانونية أو شهادات تحتوي بيانات شخصية، لا تجعلها عامة. أنشئ Bucket خاصًا واستخدم Signed URLs / Edge Functions.

## 8 — ما يزال يحتاج قرارًا مؤسسيًا قبل الإطلاق

هذه النسخة تقنية ومتصلة، لكنها لا تفترض بيانات رسمية غير موجودة:
- أسماء الخبراء والمدربين.
- البرامج والمواعيد والأسعار.
- الشعار الرسمي عالي الدقة.
- البريد الرسمي وسياسة التواصل.
- سياسة الخصوصية وشروط الاستخدام.
- آلية اعتماد الشهادات.
- بوابة الدفع إن كانت البرامج مدفوعة.
- SMTP رسمي لإرسال رسائل الإنتاج.
- محتوى المقالات والأبحاث والفعاليات.

## 9 — الدفع والإشعارات والبريد

البنية الحالية جاهزة لإضافة:
- بوابة دفع سعودية.
- Edge Functions.
- إرسال بريد آلي.
- OTP / Magic Link.
- إشعارات داخلية.
- إصدار شهادات PDF.
- رابط تحقق من الشهادة.

لا تضع مفاتيح بوابة الدفع السرية في JavaScript. هذه الوظائف يجب أن تكون عبر Edge Functions أو خادم موثوق.

## 10 — ملاحظة عن "مجاني"

الواجهة + GitHub Pages/Vercel + Supabase يمكن أن تبدأ دون تكلفة ضمن الحدود المجانية للخدمات. لكن أي نطاق مخصص، SMTP احترافي، بوابة دفع، تخزين كبير، أو استهلاك يتجاوز حدود الخطة قد تكون له تكلفة.

## هيكل المشروع

```text
bait-experts-platform/
├── index.html
├── styles.css
├── app.js
├── config.js
├── README.md
└── supabase/
    └── schema.sql
```

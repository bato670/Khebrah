const CFG = window.BAIT_CONFIG || {};
const SUPABASE_READY =
  window.supabase &&
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_PUBLISHABLE_KEY &&
  !CFG.SUPABASE_URL.includes("YOUR-PROJECT") &&
  !CFG.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");

const sb = SUPABASE_READY
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_PUBLISHABLE_KEY)
  : null;

const app = document.getElementById("app");
const loading = document.getElementById("loading");
let session = null;
let profile = null;
let cache = { courses: [], experts: [], content: [], events: [] };

const esc = v => String(v ?? "").replace(/[&<>'"]/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"
}[m]));

function toast(msg, type="") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.className = "toast", 3000);
}
function busy(on) { loading.classList.toggle("hidden", !on); }
function fmtDate(v) {
  if (!v) return "—";
  try { return new Intl.DateTimeFormat("ar-SA",{dateStyle:"medium"}).format(new Date(v)); }
  catch { return v; }
}
function money(v) {
  return Number(v || 0) === 0 ? "مجاني" : `${Number(v).toLocaleString("ar-SA")} ر.س`;
}
function roleLabel(r) {
  return ({user:"مستفيد",admin:"مدير النظام",content_manager:"مدير المحتوى",
    training_manager:"مدير التدريب",services_manager:"مدير الخدمات",instructor:"مدرب"})[r] || r || "مستفيد";
}
function isAdmin() { return ["admin","content_manager","training_manager","services_manager"].includes(profile?.role); }
function canManage(kind) {
  if (profile?.role === "admin") return true;
  return ({courses:"training_manager",content:"content_manager",services:"services_manager",
    experts:"content_manager",events:"content_manager"})[kind] === profile?.role;
}
function go(route) { location.hash = route; }
function route() { return (location.hash.replace(/^#/,"") || "home").split("/"); }

async function init() {
  if (!sb) {
    render();
    return;
  }
  busy(true);
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (session) await loadProfile();
  await loadPublicData();
  busy(false);
  render();
  sb.auth.onAuthStateChange(async (_event, newSession) => {
    session = newSession;
    profile = null;
    if (newSession) await loadProfile();
    await loadPublicData();
    render();
  });
}

async function loadProfile() {
  const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!error) profile = data;
}
async function loadPublicData() {
  if (!sb) return;
  const [c,e,a,ev] = await Promise.all([
    sb.from("courses").select("*").eq("status","published").order("start_at",{ascending:true}),
    sb.from("experts").select("*").eq("is_published",true).order("sort_order"),
    sb.from("content_items").select("*").eq("status","published").order("published_at",{ascending:false}),
    sb.from("events").select("*").eq("status","published").order("starts_at",{ascending:true})
  ]);
  cache.courses = c.data || [];
  cache.experts = e.data || [];
  cache.content = a.data || [];
  cache.events = ev.data || [];
}

/* ---------- Shared layout ---------- */
function nav() {
  const userArea = session
    ? `<button class="avatar-btn" onclick="go('${isAdmin()?'admin':'dashboard'}')">${esc((profile?.full_name || session.user.email || "م").slice(0,1))}</button>`
    : `<button class="btn btn-outline btn-sm" onclick="go('login')">تسجيل الدخول</button>`;
  return `<header class="site-header">
    <div class="container nav">
      <button class="brand" onclick="go('home')">
        <span class="brand-mark">⌂</span>
        <span><strong>بيت الخبرات القانونية</strong><small>جامعة الإمام عبدالرحمن بن فيصل</small></span>
      </button>
      <nav class="nav-links">
        <button onclick="go('home')">الرئيسية</button>
        <button onclick="go('about')">عن البيت</button>
        <button onclick="go('courses')">البرامج</button>
        <button onclick="go('experts')">الخبراء</button>
        <button onclick="go('services')">الخدمات</button>
        <button onclick="go('knowledge')">المعرفة</button>
        <button onclick="go('events')">الفعاليات</button>
      </nav>
      <div class="nav-actions">
        ${userArea}
        <button class="btn btn-primary btn-sm" onclick="go('courses')">استكشف البرامج</button>
      </div>
      <button class="menu-btn" onclick="document.body.classList.toggle('menu-open')">☰</button>
    </div>
  </header>`;
}
function footer() {
  return `<footer class="footer"><div class="container footer-grid">
    <div><div class="footer-brand">بيت الخبرات القانونية</div>
      <p>منظومة تجمع التدريب والتأهيل والخبرة والمعرفة والخدمات القانونية في تجربة رقمية واحدة.</p>
    </div>
    <div><h4>المنصة</h4><button onclick="go('courses')">البرامج</button><button onclick="go('experts')">الخبراء</button><button onclick="go('knowledge')">المعرفة</button></div>
    <div><h4>البيت</h4><button onclick="go('about')">عن البيت</button><button onclick="go('services')">الخدمات</button><button onclick="go('events')">الفعاليات</button></div>
    <div><h4>تواصل</h4><p>جامعة الإمام عبدالرحمن بن فيصل</p><p>ics.hle@iau.edu.sa</p></div>
  </div><div class="container copyright">© 2026 بيت الخبرات القانونية</div></footer>`;
}
function shell(body) { return nav()+`<main>${body}</main>`+footer(); }
function sectionHead(kicker,title,text="",action="") {
  return `<div class="section-head"><div><span class="eyebrow">${esc(kicker)}</span><h2>${esc(title)}</h2>${text?`<p>${esc(text)}</p>`:""}</div>${action}</div>`;
}

/* ---------- Public ---------- */
function home() {
  const courses = cache.courses.slice(0,3);
  return shell(`<section class="hero"><div class="container hero-grid">
    <div class="hero-copy"><span class="eyebrow">⚖ منظومة قانونية متكاملة</span>
      <h1>المعرفة القانونية<br><span>حين تتحول إلى خبرة</span></h1>
      <p>منصة بيت الخبرات القانونية للتدريب والتأهيل والخبرة والمعرفة والخدمات القانونية، في تجربة رقمية تقود المستفيد من الاكتشاف إلى التطبيق.</p>
      <div class="actions"><button class="btn btn-primary" onclick="go('courses')">استكشف البرامج التدريبية ←</button><button class="btn btn-outline" onclick="go('about')">تعرّف على البيت</button></div>
      <div class="trust-row"><span>جامعة الإمام عبدالرحمن بن فيصل</span><i></i><span>تدريب · خبرة · معرفة · خدمات</span></div>
    </div>
    <div class="hero-art"><div class="art-ring r1"></div><div class="art-ring r2"></div><div class="art-card">
      <div class="seal">⌂</div><span class="art-label">LEGAL EXPERTISE HOUSE</span><h3>من التأهيل إلى التمكين</h3><p>بيئة مهنية تجمع المعرفة القانونية بالتطبيق والخبرة.</p>
      <div class="art-metrics"><div><b>${cache.courses.length || "—"}</b><span>برنامج منشور</span></div><div><b>${cache.experts.length || "—"}</b><span>خبير</span></div><div><b>${cache.events.length || "—"}</b><span>فعالية</span></div></div>
    </div></div>
  </div></section>
  <section class="section compact"><div class="container"><div class="entry-grid">
    ${quick("▦","البرامج التدريبية","اكتشف مسارات التأهيل والدورات والورش.","courses")}
    ${quick("✦","الخبراء","تعرّف على الخبرات والكفاءات المشاركة.","experts")}
    ${quick("⚖","الخدمات القانونية","اطّلع على مجالات الخدمات التي يقدمها البيت.","services")}
    ${quick("⌁","المعرفة القانونية","مقالات وأبحاث وأدلة قانونية مختارة.","knowledge")}
  </div></div></section>
  <section class="section"><div class="container">${sectionHead("رحلتك المهنية","من الاكتشاف إلى التطبيق","مسار واضح يساعدك على اختيار ما يناسب مرحلتك القانونية.")}<div class="journey">
    ${["اكتشف","اختر مسارك","تعلّم","طبّق","واصل نموك"].map((x,i)=>`<div class="journey-step"><span>0${i+1}</span><b>${x}</b><small>${["تعرّف على مجالات البيت","اختر برنامجك أو خدمتك","اكتسب المعرفة والأدوات","حوّل المعرفة إلى ممارسة","ابنِ مسارك المهني"][i]}</small></div>`).join("")}
  </div></div></section>
  <section class="section tint"><div class="container">${sectionHead("برامج مختارة","برامجك تبدأ من هنا","برامج مصممة للتأهيل والتطبيق في مجالات قانونية متعددة.",`<button class="text-link" onclick="go('courses')">عرض جميع البرامج ←</button>`)}
    <div class="cards-3">${courses.length?courses.map(courseCard).join(""):empty("لا توجد برامج منشورة حاليًا.")}</div>
  </div></section>
  <section class="section"><div class="container">${sectionHead("مجالات الخبرة","خبرة تتقاطع مع احتياجك","مجالات قانونية ذات صلة بالقطاعات والاحتياجات التي يخدمها البيت.")}<div class="domain-grid">
    ${["القضاء الإداري","القضايا التجارية","الزكاة والضريبة والجمارك","المنازعات التأمينية","المنازعات الطبية","المنازعات العمالية"].map((x,i)=>`<div class="domain"><span>0${i+1}</span><b>${x}</b></div>`).join("")}
  </div></div></section>
  <section class="section dark-cta"><div class="container cta-inner"><div><span class="eyebrow light">ابدأ مسارك</span><h2>ما الذي تبحث عنه اليوم؟</h2><p>برنامج تدريبي، خدمة قانونية، معرفة متخصصة أو فرصة للتواصل مع خبرائنا.</p></div><div class="actions"><button class="btn btn-white" onclick="go('courses')">أستكشف البرامج</button><button class="btn btn-glass" onclick="go('services')">أطلب خدمة قانونية</button></div></div></section>`);
}
function quick(icon,title,text,target){ return `<button class="entry-card" onclick="go('${target}')"><span class="entry-icon">${icon}</span><b>${title}</b><small>${text}</small><em>←</em></button>`; }
function courseCard(c) {
  return `<article class="course-card"><div class="course-cover"><span>${esc(c.category||"قانون")}</span><button class="heart" onclick="toggleFavorite(event,'course',${c.id})">♡</button></div>
    <div class="card-body"><small>${esc(c.type||"برنامج تدريبي")} · ${esc(c.mode||"")}</small><h3>${esc(c.title)}</h3><p>${esc(c.description||"برنامج تدريبي قانوني متخصص.")}</p>
    <div class="meta"><span>${c.hours||0} ساعة</span><span>${c.sessions||0} لقاء</span><span>${money(c.price)}</span></div>
    <button class="btn btn-primary full" onclick="go('course/${c.id}')">التفاصيل والتسجيل</button></div></article>`;
}
function empty(text){return `<div class="empty">${esc(text)}</div>`;}

function about(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">عن بيت الخبرات</span><h1>شريك استراتيجي موثوق ومؤثر في القطاع القانوني.</h1><p>بيت الخبرات القانونية بجامعة الإمام عبدالرحمن بن فيصل منظومة تستهدف إبراز دور الجامعة في المجال القانوني عبر حلول ومبادرات نوعية تخدم المستفيدين.</p></div></section>
<section class="section"><div class="container two-col"><div class="statement"><span>الرؤية</span><h2>شريك استراتيجي موثوق ومؤثر في القطاع القانوني.</h2></div><div class="prose"><h3>ماذا يجمع البيت؟</h3><p>التدريب والتأهيل، الخبرة والاستشارات، المعرفة القانونية، والخدمات المتخصصة في تجربة واحدة.</p><div class="feature-list"><b>خبرة قانونية متخصصة</b><b>تدريب تطبيقي</b><b>حلول ومبادرات نوعية</b><b>بيئة مهنية متكاملة</b></div></div></div></section>
<section class="section tint"><div class="container">${sectionHead("خدمات البيت","منظومة تتجاوز التدريب","تجتمع فيها الخدمات القانونية والتدريب والدراسات والإشراف على التدريب الميداني.")}<div class="cards-3">
${["الاستشارات القانونية الشاملة","إعداد اللوائح والمذكرات القانونية","الوساطة والتحكيم","تأسيس الشركات","حوكمة الإدارات القانونية","صياغة العقود والاتفاقيات ومراجعتها"].map((x,i)=>`<div class="info-card"><span>0${i+1}</span><h3>${x}</h3><p>خدمة مصممة ضمن منظومة بيت الخبرات القانونية.</p></div>`).join("")}</div></div></section>`);}

function courses(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">البرامج التدريبية</span><h1>اختر مسارك القانوني</h1><p>ابحث واستكشف البرامج والورش والدورات المنشورة من بيت الخبرات.</p><div class="searchbar"><input id="courseSearch" oninput="filterCourses()" placeholder="ابحث باسم البرنامج أو المجال..."><select id="courseMode" onchange="filterCourses()"><option value="">كل الأنماط</option><option>حضوري</option><option>عن بُعد</option><option>هجين</option></select></div></div></section>
<section class="section"><div class="container"><div id="courseGrid" class="cards-3">${cache.courses.length?cache.courses.map(courseCard).join(""):empty("لا توجد برامج منشورة حاليًا.")}</div></div></section>`);}

function filterCourses(){
  const q=(document.getElementById("courseSearch")?.value||"").toLowerCase();
  const m=document.getElementById("courseMode")?.value||"";
  const list=cache.courses.filter(c=>(`${c.title} ${c.category} ${c.description}`.toLowerCase().includes(q))&&(!m||c.mode===m));
  document.getElementById("courseGrid").innerHTML=list.length?list.map(courseCard).join(""):empty("لا توجد نتائج مطابقة.");
}

function courseDetails(id){
  const c=cache.courses.find(x=>x.id===Number(id));
  if(!c) return shell(`<section class="section"><div class="container">${empty("البرنامج غير موجود.")}</div></section>`);
  return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">${esc(c.category)}</span><h1>${esc(c.title)}</h1><p>${esc(c.description||"")}</p></div></section>
<section class="section"><div class="container two-col"><div class="panel"><h2>تفاصيل البرنامج</h2><div class="detail-grid"><div><small>النوع</small><b>${esc(c.type)}</b></div><div><small>النمط</small><b>${esc(c.mode)}</b></div><div><small>الساعات</small><b>${c.hours}</b></div><div><small>اللقاءات</small><b>${c.sessions}</b></div><div><small>البداية</small><b>${fmtDate(c.start_at)}</b></div><div><small>الرسوم</small><b>${money(c.price)}</b></div></div></div>
<div class="panel sticky"><span class="eyebrow">التسجيل</span><h2>${money(c.price)}</h2><p>سجّل في البرنامج من حسابك، ويمكنك متابعة حالة التسجيل من لوحة المستفيد.</p>${session?`<button class="btn btn-primary full" onclick="enroll(${c.id})">التسجيل في البرنامج</button>`:`<button class="btn btn-primary full" onclick="go('login')">تسجيل الدخول للتسجيل</button>`}</div></div></section>`);
}

function expertsPage(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">الخبراء</span><h1>خبرات وكفاءات في مجالات القانون</h1><p>مساحة تعريفية بالخبراء والمدربين المشاركين في برامج وخدمات البيت.</p></div></section><section class="section"><div class="container"><div class="cards-3">${cache.experts.length?cache.experts.map(e=>`<article class="expert-card"><div class="expert-avatar">${esc((e.full_name||"خ").slice(0,1))}</div><small>${esc(e.title||"خبير قانوني")}</small><h3>${esc(e.full_name)}</h3><p>${esc(e.bio||"")}</p><div class="tags">${(e.specialties||[]).map(s=>`<span>${esc(s)}</span>`).join("")}</div></article>`).join(""):empty("لا توجد بيانات منشورة عن الخبراء حاليًا.")}</div></div></section>`);}

function services(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">الخدمات القانونية</span><h1>خدمة قانونية تبدأ من فهم احتياجك</h1><p>استكشف مجالات الخدمة، ثم أرسل طلبك ليظهر في حسابك ويتولى فريق البيت متابعته.</p></div></section><section class="section"><div class="container cards-3">
${["استشارات قانونية","لوائح ومذكرات قانونية","وساطة وتحكيم","تأسيس شركات","حوكمة إدارات قانونية","عقود واتفاقيات"].map((x,i)=>`<article class="service-card"><span>0${i+1}</span><h3>${x}</h3><p>خدمة قانونية متخصصة بحسب نطاق عمل البيت.</p><button class="btn btn-outline full" onclick="requestService('${x}')">طلب الخدمة</button></article>`).join("")}
</div></section>`);}

function knowledge(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">المعرفة القانونية</span><h1>معرفة قانونية قابلة للاستخدام</h1><p>مقالات وأبحاث وأدلة ومحتوى معرفي ينشره فريق البيت وخبراؤه.</p></div></section><section class="section"><div class="container cards-3">${cache.content.length?cache.content.map(a=>`<article class="article-card"><small>${esc(a.content_type)}</small><h3>${esc(a.title)}</h3><p>${esc(a.excerpt||"")}</p><span>${fmtDate(a.published_at)}</span><button class="text-link" onclick="go('article/${a.id}')">اقرأ المزيد ←</button></article>`).join(""):empty("لا يوجد محتوى منشور حاليًا.")}</div></section>`);}

function article(id){const a=cache.content.find(x=>x.id===Number(id));return shell(`<section class="section"><div class="container article-page">${a?`<span class="eyebrow">${esc(a.content_type)}</span><h1>${esc(a.title)}</h1><small>${fmtDate(a.published_at)}</small><div class="article-body">${esc(a.body||a.excerpt||"").replace(/\n/g,"<br>")}</div>`:empty("المحتوى غير موجود.")}</div></section>`);}

function events(){return shell(`<section class="page-hero"><div class="container"><span class="eyebrow">الفعاليات</span><h1>فعاليات البيت ومواعيده القادمة</h1><p>تابع البرامج واللقاءات والأنشطة المنشورة.</p></div></section><section class="section"><div class="container cards-3">${cache.events.length?cache.events.map(e=>`<article class="event-card"><div class="event-date">${fmtDate(e.starts_at)}</div><small>${esc(e.event_type||"فعالية")}</small><h3>${esc(e.title)}</h3><p>${esc(e.description||"")}</p><span>${esc(e.location||"عن بُعد")}</span></article>`).join(""):empty("لا توجد فعاليات منشورة حاليًا.")}</div></section>`);}

/* ---------- Auth ---------- */
function login(){return shell(`<section class="auth-page"><div class="auth-card"><span class="eyebrow">بوابة الدخول</span><h1>مرحبًا بعودتك</h1><p>سجّل الدخول للوصول إلى برامجك وطلباتك وشهاداتك.</p><form onsubmit="loginUser(event)"><label>البريد الإلكتروني<input id="email" type="email" required autocomplete="email"></label><label>كلمة المرور<input id="password" type="password" required autocomplete="current-password"></label><button class="btn btn-primary full">تسجيل الدخول</button></form><button class="text-link" onclick="resetPassword()">نسيت كلمة المرور؟</button><div class="auth-divider">ليس لديك حساب؟</div><button class="btn btn-outline full" onclick="go('signup')">إنشاء حساب جديد</button>${!SUPABASE_READY?`<div class="setup-note">لم يتم إعداد Supabase بعد. افتح <b>config.js</b> وضع بيانات مشروعك.</div>`:""}</div></section>`);}
function signup(){return shell(`<section class="auth-page"><div class="auth-card"><span class="eyebrow">حساب جديد</span><h1>أنشئ حسابك</h1><p>حساب المستفيد يتيح التسجيل في البرامج ومتابعة الطلبات والشهادات.</p><form onsubmit="signupUser(event)"><label>الاسم الكامل<input id="name" required autocomplete="name"></label><label>البريد الإلكتروني<input id="email" type="email" required autocomplete="email"></label><label>رقم الجوال<input id="phone" inputmode="tel" autocomplete="tel"></label><label>كلمة المرور<input id="password" type="password" minlength="8" required autocomplete="new-password"></label><button class="btn btn-primary full">إنشاء الحساب</button></form><div class="auth-divider">لديك حساب؟</div><button class="btn btn-outline full" onclick="go('login')">تسجيل الدخول</button></div></section>`);}
async function loginUser(e){
  e.preventDefault();
  if(!sb){toast("إعداد Supabase غير مكتمل","error");return;}
  busy(true);
  const {error}=await sb.auth.signInWithPassword({email:email.value,password:password.value});
  busy(false);
  if(error){toast(error.message,"error");return;}
  toast("تم تسجيل الدخول");
  go("dashboard");
}
async function signupUser(e){
  e.preventDefault();
  if(!sb){toast("إعداد Supabase غير مكتمل","error");return;}
  busy(true);
  const {data,error}=await sb.auth.signUp({email:email.value,password:password.value,
    options:{data:{full_name:name.value,phone:phone.value,role:"user"},emailRedirectTo:CFG.SITE_URL}});
  busy(false);
  if(error){toast(error.message,"error");return;}
  if(data.session){toast("تم إنشاء الحساب");go("dashboard");}
  else toast("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب.");
}
async function resetPassword(){
  if(!sb){toast("إعداد Supabase غير مكتمل","error");return;}
  const email=prompt("أدخل بريدك الإلكتروني:");
  if(!email)return;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:CFG.SITE_URL+"#reset"});
  toast(error?error.message:"تم إرسال رابط إعادة تعيين كلمة المرور.");
}
async function logout(){if(sb) await sb.auth.signOut(); session=null;profile=null;go("home");}

/* ---------- Beneficiary ---------- */
async function dashboard(){
  if(!session)return go("login");
  busy(true);
  const [en,cert,req,fav] = await Promise.all([
    sb.from("enrollments").select("*,courses(*)").eq("user_id",session.user.id).order("enrolled_at",{ascending:false}),
    sb.from("certificates").select("*,courses(title)").eq("user_id",session.user.id).order("issued_at",{ascending:false}),
    sb.from("service_requests").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}),
    sb.from("favorites").select("*").eq("user_id",session.user.id)
  ]);
  busy(false);
  const enrollments=en.data||[], certs=cert.data||[], requests=req.data||[];
  return shell(`<section class="dashboard"><div class="container dash-layout">
    ${side("dashboard")}
    <div class="dash-main"><div class="dash-top"><div><span class="eyebrow">مساحة المستفيد</span><h1>مرحبًا، ${esc(profile?.full_name||session.user.email)} 👋</h1></div><button class="btn btn-outline btn-sm" onclick="logout()">تسجيل الخروج</button></div>
    <div class="stat-grid"><div><small>دوراتي</small><b>${enrollments.length}</b></div><div><small>المكتملة</small><b>${enrollments.filter(x=>x.status==="completed").length}</b></div><div><small>الشهادات</small><b>${certs.length}</b></div><div><small>الطلبات</small><b>${requests.length}</b></div></div>
    <div class="panel"><div class="panel-head"><h2>استكمل تعلّمك</h2><button class="text-link" onclick="go('courses')">استكشف البرامج ←</button></div>
      ${enrollments.length?enrollments.map(x=>`<div class="learning-row"><div><b>${esc(x.courses?.title||"برنامج")}</b><small>${esc(x.status)}</small></div><strong>${x.progress}%</strong><div class="progress"><span style="width:${x.progress}%"></span></div></div>`).join(""):empty("لم تسجل في أي برنامج بعد.")}
    </div>
    <div class="panel"><div class="panel-head"><h2>آخر طلبات الخدمات</h2><button class="text-link" onclick="go('dashboard/requests')">عرض الكل</button></div>
      ${requests.slice(0,3).map(x=>`<div class="list-row"><b>${esc(x.service_type)}</b><span class="status">${esc(x.status)}</span><small>${fmtDate(x.created_at)}</small></div>`).join("")||empty("لا توجد طلبات بعد.")}
    </div>
    <div class="panel"><div class="panel-head"><h2>شهاداتي</h2><button class="text-link" onclick="go('dashboard/certificates')">عرض الشهادات</button></div>
      ${certs.slice(0,3).map(x=>`<div class="list-row"><b>${esc(x.certificate_number)}</b><span>${esc(x.courses?.title||"")}</span><small>${fmtDate(x.issued_at)}</small></div>`).join("")||empty("لا توجد شهادات صادرة بعد.")}
    </div>
    </div></div></section>`);
}
function side(active){
  const items=[["dashboard","لوحتي"],["courses","استكشف البرامج"],["dashboard/certificates","شهاداتي"],["dashboard/requests","طلباتي"],["dashboard/favorites","المفضلة"],["dashboard/profile","حسابي"]];
  return `<aside class="sidebar"><div class="side-title">مساحة المستفيد</div>${items.map(([r,t])=>`<button class="${active===r?"active":""}" onclick="go('${r}')">${t}</button>`).join("")}${isAdmin()?`<div class="side-sep"></div><button onclick="go('admin')">لوحة الإدارة</button>`:""}<div class="side-sep"></div><button onclick="logout()">تسجيل الخروج</button></aside>`;
}
async function enroll(courseId){
  if(!session)return go("login");
  const {error}=await sb.from("enrollments").insert({user_id:session.user.id,course_id:courseId,status:"enrolled"});
  if(error){toast(error.code==="23505"?"أنت مسجل في هذا البرنامج بالفعل.":error.message,"error");return;}
  toast("تم التسجيل في البرنامج");
  go("dashboard");
}
async function requestService(serviceType){
  if(!session){toast("سجّل الدخول أولًا");go("login");return;}
  const details=prompt(`اكتب تفاصيل طلب «${serviceType}»:`);
  if(details===null)return;
  const subject=prompt("عنوان الطلب:","طلب خدمة قانونية");
  if(!subject)return;
  const {error}=await sb.from("service_requests").insert({user_id:session.user.id,service_type:serviceType,subject,details});
  toast(error?error.message:"تم إرسال طلبك بنجاح");
  if(!error)go("dashboard/requests");
}
async function dashboardSub(tab){
  if(!session)return go("login");
  busy(true);
  let body="";
  if(tab==="certificates"){
    const {data,error}=await sb.from("certificates").select("*,courses(title)").eq("user_id",session.user.id).order("issued_at",{ascending:false});
    busy(false); if(error){toast(error.message,"error");return go("dashboard");}
    body=`<div class="panel"><h2>الشهادات</h2>${data?.map(x=>`<div class="list-row"><div><b>${esc(x.certificate_number)}</b><small>${esc(x.courses?.title||"")}</small></div><span>${fmtDate(x.issued_at)}</span>${x.pdf_url?`<a class="text-link" href="${esc(x.pdf_url)}" target="_blank" rel="noopener">فتح</a>`:""}</div>`).join("")||empty("لا توجد شهادات.")}</div>`;
  } else if(tab==="requests"){
    const {data,error}=await sb.from("service_requests").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});
    busy(false); if(error){toast(error.message,"error");return go("dashboard");}
    body=`<div class="panel"><div class="panel-head"><h2>طلباتي</h2><button class="btn btn-primary btn-sm" onclick="go('services')">طلب خدمة</button></div>${data?.map(x=>`<div class="request-card"><div><b>${esc(x.service_type)}</b><h3>${esc(x.subject)}</h3><p>${esc(x.details||"")}</p></div><span class="status">${esc(x.status)}</span></div>`).join("")||empty("لا توجد طلبات.")}</div>`;
  } else if(tab==="favorites"){
    const {data,error}=await sb.from("favorites").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});
    busy(false); if(error){toast(error.message,"error");return go("dashboard");}
    body=`<div class="panel"><h2>المفضلة</h2>${data?.map(favoriteRow).join("")||empty("لم تضف أي عنصر إلى المفضلة.")}</div>`;
  } else if(tab==="profile"){
    busy(false);
    body=`<div class="panel"><h2>حسابي</h2><form onsubmit="saveProfile(event)" class="profile-form"><label>الاسم الكامل<input id="pname" value="${esc(profile?.full_name)}" required></label><label>رقم الجوال<input id="pphone" value="${esc(profile?.phone||"")}"></label><label>التخصص<input id="pspecialty" value="${esc(profile?.specialty||"")}"></label><button class="btn btn-primary">حفظ التغييرات</button></form></div>`;
  }
  return shell(`<section class="dashboard"><div class="container dash-layout">${side("dashboard/"+tab)}<div class="dash-main"><div class="dash-top"><div><span class="eyebrow">مساحة المستفيد</span><h1>${tab==="certificates"?"شهاداتي":tab==="requests"?"طلباتي":tab==="favorites"?"المفضلة":"حسابي"}</h1></div></div>${body}</div></div></section>`);
}
function favoriteRow(f){
  const c=f.entity_type==="course"?cache.courses.find(x=>x.id===f.entity_id):null;
  const a=f.entity_type==="content"?cache.content.find(x=>x.id===f.entity_id):null;
  const x=c||a;
  return x?`<div class="list-row"><b>${esc(x.title)}</b><span>${esc(f.entity_type)}</span><button class="text-link" onclick="toggleFavorite(event,'${f.entity_type}',${f.entity_id})">إزالة</button></div>`:"";
}
async function toggleFavorite(event,type,id){
  event?.stopPropagation();
  if(!session){toast("سجّل الدخول لاستخدام المفضلة");return;}
  const {data}=await sb.from("favorites").select("*").eq("user_id",session.user.id).eq("entity_type",type).eq("entity_id",id).maybeSingle();
  if(data) await sb.from("favorites").delete().eq("user_id",session.user.id).eq("entity_type",type).eq("entity_id",id);
  else await sb.from("favorites").insert({user_id:session.user.id,entity_type:type,entity_id:id});
  toast(data?"أزيل من المفضلة":"أضيف إلى المفضلة");
}
async function saveProfile(e){
  e.preventDefault();
  const {error}=await sb.from("profiles").update({full_name:pname.value,phone:pphone.value,specialty:pspecialty.value}).eq("id",session.user.id);
  if(error){toast(error.message,"error");return;}
  await loadProfile(); toast("تم حفظ بيانات الحساب");
}

/* ---------- Admin ---------- */
async function admin(){
  if(!session || !isAdmin()) { go("login"); return ""; }
  busy(true);
  const [users,courses,enroll,requests,content,experts,events] = await Promise.all([
    sb.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),
    sb.from("courses").select("*").order("created_at",{ascending:false}),
    sb.from("enrollments").select("*,courses(title)").order("enrolled_at",{ascending:false}).limit(100),
    sb.from("service_requests").select("*,profiles(full_name)").order("created_at",{ascending:false}).limit(100),
    sb.from("content_items").select("*").order("created_at",{ascending:false}),
    sb.from("experts").select("*").order("sort_order"),
    sb.from("events").select("*").order("starts_at")
  ]);
  busy(false);
  cache.admin={users:users.data||[],courses:courses.data||[],enrollments:enroll.data||[],requests:requests.data||[],content:content.data||[],experts:experts.data||[],events:events.data||[]};
  const section=route()[1]||"overview";
  return shell(`<section class="dashboard"><div class="container dash-layout"><aside class="sidebar admin-side"><div class="side-title">إدارة البيت</div>${[
    ["overview","نظرة عامة"],["courses","البرامج"],["users","المستفيدون"],["experts","الخبراء"],["content","المحتوى"],["events","الفعاليات"],["requests","طلبات الخدمات"],["enrollments","التسجيلات"]
  ].map(([r,t])=>`<button class="${section===r?"active":""}" onclick="go('admin/${r}')">${t}</button>`).join("")}<div class="side-sep"></div><button onclick="go('dashboard')">مساحة المستفيد</button><button onclick="logout()">تسجيل الخروج</button></aside>
  <div class="dash-main"><div class="dash-top"><div><span class="eyebrow">لوحة إدارة بيت الخبرات</span><h1>${adminTitle(section)}</h1></div><span class="admin-badge">${roleLabel(profile.role)}</span></div>${adminContent(section)}</div></div></section>`);
}
function adminTitle(s){return ({overview:"مركز التحكم",courses:"إدارة البرامج",users:"إدارة المستفيدين",experts:"إدارة الخبراء",content:"إدارة المعرفة",events:"إدارة الفعاليات",requests:"طلبات الخدمات",enrollments:"التسجيلات"})[s]||"مركز التحكم";}
function adminContent(s){
  const d=cache.admin;
  if(s==="overview") return `<div class="stat-grid"><div><small>المستفيدون</small><b>${d.users.length}</b></div><div><small>البرامج</small><b>${d.courses.length}</b></div><div><small>التسجيلات</small><b>${d.enrollments.length}</b></div><div><small>طلبات الخدمات</small><b>${d.requests.length}</b></div></div><div class="panel"><h2>آخر النشاطات</h2>${d.requests.slice(0,5).map(r=>`<div class="list-row"><b>${esc(r.service_type)}</b><span>${esc(r.profiles?.full_name||"مستفيد")}</span><small>${fmtDate(r.created_at)}</small></div>`).join("")||empty("لا توجد نشاطات بعد.")}</div>`;
  if(s==="courses") return manageTable("البرامج",d.courses,["title","category","mode","hours","status"],"course",canManage("courses"));
  if(s==="users") return manageTable("المستفيدون",d.users,["full_name","role","phone","created_at"],"user",profile.role==="admin");
  if(s==="experts") return manageTable("الخبراء",d.experts,["full_name","title","is_published"],"expert",canManage("experts"));
  if(s==="content") return manageTable("المحتوى",d.content,["title","content_type","status","published_at"],"content",canManage("content"));
  if(s==="events") return manageTable("الفعاليات",d.events,["title","event_type","starts_at","status"],"event",canManage("events"));
  if(s==="requests") return requestsTable(d.requests);
  if(s==="enrollments") return manageTable("التسجيلات",d.enrollments.map(x=>({...x,user_name:x.profiles?.full_name,course_name:x.courses?.title})),["user_name","course_name","progress","status"],"enrollment",profile.role==="admin"||profile.role==="training_manager");
  return "";
}
function manageTable(title,rows,fields,type,allow){
  const add=allow && ["course","expert","content","event"].includes(type)?`<button class="btn btn-primary btn-sm" onclick="openEditor('${type}')">+ إضافة</button>`:"";
  return `<div class="panel"><div class="panel-head"><h2>${title}</h2>${add}</div><div class="table-wrap"><table class="table"><thead><tr>${fields.map(f=>`<th>${fieldLabel(f)}</th>`).join("")}<th>إجراء</th></tr></thead><tbody>${rows.map(r=>`<tr>${fields.map(f=>`<td>${esc(displayField(r,f))}</td>`).join("")}<td>${allow&&["course","expert","content","event"].includes(type)?`<button class="btn btn-outline btn-sm" onclick="openEditor('${type}',${r.id})">تعديل</button> <button class="btn btn-danger btn-sm" onclick="deleteItem('${type}',${r.id})">حذف</button>`:"—"}</td></tr>`).join("")||`<tr><td colspan="${fields.length+1}">لا توجد بيانات.</td></tr>`}</tbody></table></div></div>`;
}
function fieldLabel(f){return ({title:"العنوان",category:"المجال",mode:"النمط",hours:"الساعات",status:"الحالة",full_name:"الاسم",role:"الصلاحية",phone:"الجوال",created_at:"تاريخ الإنشاء",is_published:"منشور",content_type:"النوع",published_at:"النشر",event_type:"النوع",starts_at:"البداية",progress:"التقدم",user_name:"المستفيد",course_name:"البرنامج"})[f]||f;}
function displayField(r,f){if(f==="created_at"||f==="published_at"||f==="starts_at")return fmtDate(r[f]);if(f==="is_published")return r[f]?"نعم":"لا";return r[f]??"";}
function requestsTable(rows){return `<div class="panel"><div class="panel-head"><h2>طلبات الخدمات</h2><span class="muted">تُحدّث حالة الطلب من هنا</span></div><div class="table-wrap"><table class="table"><thead><tr><th>المستفيد</th><th>الخدمة</th><th>العنوان</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.profiles?.full_name||"—")}</td><td>${esc(r.service_type)}</td><td>${esc(r.subject)}</td><td><select onchange="updateRequest(${r.id},this.value)">${["new","reviewing","in_progress","completed","rejected"].map(s=>`<option value="${s}" ${s===r.status?"selected":""}>${s}</option>`).join("")}</select></td><td>${fmtDate(r.created_at)}</td><td><button class="btn btn-outline btn-sm" onclick="alert(${JSON.stringify(r.details||"لا توجد تفاصيل")})">التفاصيل</button></td></tr>`).join("")||`<tr><td colspan="6">لا توجد طلبات.</td></tr>`}</tbody></table></div></div>`;}

async function updateRequest(id,status){
  const {error}=await sb.from("service_requests").update({status}).eq("id",id);
  toast(error?error.message:"تم تحديث حالة الطلب");
  if(!error)render();
}

function openEditor(type,id=null){
  const d=cache.admin;
  const maps={course:d.courses,expert:d.experts,content:d.content,event:d.events};
  const item=id?maps[type].find(x=>x.id===Number(id)):{};
  const forms={
    course:[["title","اسم البرنامج","text",item.title||""],["category","المجال","text",item.category||""],["type","نوع البرنامج","text",item.type||"برنامج تدريبي"],["description","الوصف","textarea",item.description||""],["hours","الساعات","number",item.hours||1],["sessions","اللقاءات","number",item.sessions||1],["mode","النمط","text",item.mode||"حضوري"],["start_at","تاريخ البداية","datetime-local",item.start_at?item.start_at.slice(0,16):""],["end_at","تاريخ النهاية","datetime-local",item.end_at?item.end_at.slice(0,16):""],["price","الرسوم","number",item.price||0],["status","الحالة","text",item.status||"draft"],["cover_url","رابط الغلاف","url",item.cover_url||""]],
    expert:[["full_name","الاسم","text",item.full_name||""],["title","المسمى","text",item.title||""],["bio","النبذة","textarea",item.bio||""],["specialties","التخصصات (افصل بينها بفاصلة)","text",(item.specialties||[]).join(", ")],["avatar_url","رابط الصورة","url",item.avatar_url||""],["is_published","منشور؟","checkbox",item.is_published??true]],
    content:[["title","العنوان","text",item.title||""],["content_type","النوع","text",item.content_type||"article"],["excerpt","المختصر","textarea",item.excerpt||""],["body","المحتوى","textarea",item.body||""],["status","الحالة","text",item.status||"draft"]],
    event:[["title","عنوان الفعالية","text",item.title||""],["event_type","النوع","text",item.event_type||"ندوة"],["description","الوصف","textarea",item.description||""],["starts_at","البداية","datetime-local",item.starts_at?item.starts_at.slice(0,16):""],["ends_at","النهاية","datetime-local",item.ends_at?item.ends_at.slice(0,16):""],["location","الموقع","text",item.location||""],["status","الحالة","text",item.status||"draft"]]
  };
  const fields=forms[type];
  document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="editor"><div class="modal-card"><button class="close" onclick="document.getElementById('editor').remove()">×</button><span class="eyebrow">${id?"تعديل":"إضافة"}</span><h2>${adminTitle(type==="course"?"courses":type==="expert"?"experts":type==="content"?"content":"events")}</h2><form onsubmit="saveEditor(event,'${type}',${id||"null"})">${fields.map(([key,label,input,val])=>input==="textarea"?`<label>${label}<textarea id="f_${key}" rows="4">${esc(val)}</textarea></label>`:input==="checkbox"?`<label class="check"><input id="f_${key}" type="checkbox" ${val?"checked":""}> ${label}</label>`:`<label>${label}<input id="f_${key}" type="${input}" value="${esc(val)}" ${key==="title"||key==="full_name"?"required":""}></label>`).join("")}<button class="btn btn-primary full">حفظ</button></form></div></div>`);
}
async function saveEditor(e,type,id){
  e.preventDefault();
  const idNum=id==="null"?null:Number(id);
  const get=k=>document.getElementById("f_"+k);
  let payload={};
  const fields={course:["title","category","type","description","hours","sessions","mode","start_at","end_at","price","status","cover_url"],
    expert:["full_name","title","bio","specialties","avatar_url","is_published"],content:["title","content_type","excerpt","body","status"],event:["title","event_type","description","starts_at","ends_at","location","status"]}[type];
  fields.forEach(k=>{const el=get(k); if(!el)return; payload[k]=el.type==="checkbox"?el.checked:el.value;});
  if(type==="course"){payload.hours=Number(payload.hours||1);payload.sessions=Number(payload.sessions||1);payload.price=Number(payload.price||0);}
  if(type==="expert")payload.specialties=String(payload.specialties||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(type==="content" && payload.status==="published" && !payload.published_at)payload.published_at=new Date().toISOString();
  if(type==="course" && payload.status==="published" && !payload.created_by)payload.created_by=session.user.id;
  if(type==="event" && payload.status==="published" && !payload.published_at)payload.published_at=new Date().toISOString();
  const table={course:"courses",expert:"experts",content:"content_items",event:"events"}[type];
  busy(true);
  const result=idNum?await sb.from(table).update(payload).eq("id",idNum):await sb.from(table).insert(payload);
  busy(false);
  if(result.error){toast(result.error.message,"error");return;}
  document.getElementById("editor").remove(); toast("تم الحفظ بنجاح"); await loadPublicData(); go("admin/"+({course:"courses",expert:"experts",content:"content",event:"events"}[type]));
}
async function deleteItem(type,id){
  if(!confirm("هل أنت متأكد من حذف هذا العنصر؟"))return;
  const table={course:"courses",expert:"experts",content:"content_items",event:"events"}[type];
  const {error}=await sb.from(table).delete().eq("id",id);
  toast(error?error.message:"تم الحذف");
  if(!error){await loadPublicData();render();}
}

/* ---------- Router ---------- */
async function render(){
  const r=route(), name=r[0];
  if(name==="home") app.innerHTML=home();
  else if(name==="about") app.innerHTML=about();
  else if(name==="courses") app.innerHTML=courses();
  else if(name==="course") app.innerHTML=courseDetails(r[1]);
  else if(name==="experts") app.innerHTML=expertsPage();
  else if(name==="services") app.innerHTML=services();
  else if(name==="knowledge") app.innerHTML=knowledge();
  else if(name==="article") app.innerHTML=article(r[1]);
  else if(name==="events") app.innerHTML=events();
  else if(name==="login") app.innerHTML=login();
  else if(name==="signup") app.innerHTML=signup();
  else if(name==="dashboard") {
    if(r[1]) app.innerHTML=await dashboardSub(r[1]);
    else app.innerHTML=await dashboard();
  }
  else if(name==="admin") app.innerHTML=await admin();
  else app.innerHTML=home();
  window.scrollTo({top:0,behavior:"smooth"});
}
window.addEventListener("hashchange",render);
init();
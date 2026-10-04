// SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://lqsyaareyxllqzpgyaem.supabase.co";
// Altta görselden aldığın Publishable Key yer alıyor
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxc3lhYXJleXhsbHF6cGd5YWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTQyMzMsImV4cCI6MjEwNjY5MDIzM30.qbOpsZFxpveyutSWdAl7U3T2ycdl18vH1ndoJ1OyGZQ"; 

// Global Supabase İstemcisi
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.currentUser = null;
window.currentProfile = null;

// 1. KAYIT FONKSİYONU
window.registerUser = async function(email, password, username) {
  const cleanUsername = username.trim().toLowerCase();
  
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Kullanıcı adı en az 3 karakter olmalıdır.");
  }

  // Kullanıcı adı daha önce alınmış mı?
  const { data: existingUser, error: checkErr } = await window.supabaseClient
    .from('profiles')
    .select('username')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (existingUser) {
    throw new Error("Bu kullanıcı adı zaten alınmış!");
  }

  // Supabase Auth ile kullanıcı oluşturma
  const { data, error } = await window.supabaseClient.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: { username: cleanUsername }
    }
  });

  if (error) throw error;
  return data;
};

// 2. GİRİŞ FONKSİYONU
window.loginUser = async function(email, password) {
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) throw error;

  // E-Posta onay kontrolü
  if (!data.user.email_confirmed_at) {
    await window.supabaseClient.auth.signOut();
    throw new Error("Lütfen önce gelen kutunuzdaki onay linkine tıklayarak e-postanızı doğrulayın!");
  }

  window.currentUser = data.user;
  
  // Profil verisini çek
  const { data: profile, error: profErr } = await window.supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', window.currentUser.id)
    .single();

  if (profErr) throw profErr;
  window.currentProfile = profile;

  // Durumu online yap
  await window.supabaseClient.from('profiles').update({ status: 'online' }).eq('id', window.currentUser.id);

  return { user: window.currentUser, profile: window.currentProfile };
};

// 3. MEVCUT OTURUMU GERİ YÜKLEME
window.restoreSession = async function() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session && session.user && session.user.email_confirmed_at) {
    window.currentUser = session.user;
    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', window.currentUser.id)
      .single();
    
    window.currentProfile = profile;
    return { user: window.currentUser, profile: window.currentProfile };
  }
  return null;
};

// 4. ÇIKIŞ FONKSİYONU
window.logoutUser = async function() {
  if (window.currentUser) {
    await window.supabaseClient.from('profiles').update({ status: 'offline' }).eq('id', window.currentUser.id);
  }
  await window.supabaseClient.auth.signOut();
  window.currentUser = null;
  window.currentProfile = null;
};
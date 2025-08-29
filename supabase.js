const SUPABASE_URL = 'https://sbndukcexhnayyicmkli.supabase.co'
// USA SIEMPRE LA CLAVE PÚBLICA (ANON) EN EL FRONTEND
const SUPABASE_KEY = 'sb_publishable_mXeziozDxW2rwtMaIv-_4Q_UupEfGKO'

// El objeto global se llama 'supabase', lo usamos para crear nuestro cliente.
// Guardamos el cliente en una nueva constante para usarla en toda la app.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkSupabaseConnection() {
  const statusDiv = document.getElementById("supabaseStatus")
  try {
    // CORREGIDO: Usamos la variable 'supabaseClient' que creamos arriba.
    const { data, error } = await supabaseClient.from('categories').select('key').limit(1)
    if (error) {
      statusDiv.className = "alert alert-danger position-fixed top-0 end-0 m-3"
      statusDiv.textContent = `❌ Error de conexión: ${error.message}`
    } else {
      statusDiv.className = "alert alert-success position-fixed top-0 end-0 m-3"
      statusDiv.textContent = "✅ Conectado a Supabase"
    }
  } catch (e) {
    statusDiv.className = "alert alert-danger position-fixed top-0 end-0 m-3"
    statusDiv.textContent = `❌ Error de conexión: ${e.message}`
  }
}


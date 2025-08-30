// Estado global de la aplicación
const gameState = {
  currentUser: null,
  isAdmin: false,
  roomCode: null,
  codeExpiration: null,
  codeTimer: null,
  selectedCategory: null,
  readingTime: 60,
  categories: {}, // Se cargará desde Supabase, ya no hay datos por defecto
  gameData: {
    readingText: "",
    questions: [],
  },
  userAnswers: [],
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
  // Llama a la función de Supabase para cargar las categorías al iniciar
  await loadCategories()
  showScreen("loginScreen")
})

// --- PANTALLAS Y NAVEGACIÓN ---
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active")
  })
  document.getElementById(screenId).classList.add("active")
}

function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach((tab) => (tab.style.display = "none"))
  document.querySelectorAll(".nav-link").forEach((btn) => btn.classList.remove("active"))
  document.getElementById(tabName + "Tab").style.display = "block"
  // Asegurarse de que event.target exista
  if (event && event.target) {
    event.target.classList.add("active")
  }
}

// --- AUTENTICACIÓN Y SESIÓN ---
function login() {
  const user = document.getElementById("loginUser").value
  const pass = document.getElementById("loginPass").value
  if (user === "Leonardo" && pass === "0000001") {
    gameState.currentUser = user
    gameState.isAdmin = true
    showUserHeader(user)
    showScreen("adminScreen")
  } else {
    alert("Credenciales incorrectas")
  }
}

function logout() {
  gameState.currentUser = null
  gameState.isAdmin = false
  gameState.selectedCategory = null
  hideUserHeader()
  showScreen("loginScreen")
}

function showStudentLogin() {
  showScreen("studentLoginScreen")
}

async function studentLogin() {
  const name = document.getElementById("studentName").value.trim()
  const roomCode = document.getElementById("studentRoomCode").value.trim().toUpperCase()
  if (!name || !roomCode) {
    return showNotification("Por favor, completa todos los campos", "warning")
  }

  const { data, error } = await supabaseClient.from("room_codes").select("*").eq("code", roomCode).single()
  if (error || !data) return showNotification("Código de sala inválido", "error")
  if (new Date(data.expires_at) < new Date()) return showNotification("El código de sala ha expirado", "warning")

  const { data: catData, error: catError } = await supabaseClient.from("categories").select("*").eq("key", data.category_key).single()
  if (catError || !catData) return showNotification("Categoría no encontrada", "error")

  gameState.selectedCategory = catData.key
  gameState.gameData = { readingText: catData.readingText, questions: catData.questions }
  gameState.currentUser = name
  showUserHeader(name)
  startReading()
}

// --- GESTIÓN DE CATEGORÍAS (ADMIN - CONECTADO A SUPABASE) ---
async function loadCategories() {
  const { data, error } = await supabaseClient.from("categories").select("*")
  if (error) {
    showNotification(`Error al cargar categorías: ${error.message}`, "error")
    return
  }
  gameState.categories = {}
  data.forEach((cat) => {
    gameState.categories[cat.key] = cat
  })
  loadCategoriesDisplay()
}

function loadCategoriesDisplay() {
  const container = document.getElementById("categoriesList")
  container.innerHTML = ""
  Object.keys(gameState.categories).forEach((key) => {
    const category = gameState.categories[key]
    const categoryDiv = document.createElement("div")
    categoryDiv.className = `category-item ${gameState.selectedCategory === key ? "active" : ""}`
    categoryDiv.innerHTML = `
      <div class="category-info"><h5>${category.name}</h5></div>
      <div class="category-actions">
        <button class="select-btn" onclick="selectCategory('${key}')">${gameState.selectedCategory === key ? "✓ Activa" : "Seleccionar"}</button>
        <button class="delete-btn" onclick="deleteCategory('${key}')">🗑️</button>
      </div>`
    container.appendChild(categoryDiv)
  })
}

async function createCategory() {
  const name = document.getElementById("newCategoryName").value.trim()
  if (!name) return alert("Por favor ingresa un nombre para la categoría")
  const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]/g, "")
  const newCategory = { key, name, readingText: "", questions: [] }
  const { error } = await supabaseClient.from("categories").insert([newCategory])
  if (error) return showNotification(`Error al crear: ${error.message}`, "error")
  showNotification("Categoría creada en Supabase", "success")
  document.getElementById("newCategoryName").value = ""
  await loadCategories()
}

async function deleteCategory(key) {
  const categoryName = gameState.categories[key].name
  if (!confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?`)) return
  const { error } = await supabaseClient.from("categories").delete().eq("key", key)
  if (error) return showNotification(`Error al eliminar: ${error.message}`, "error")
  if (gameState.selectedCategory === key) {
    gameState.selectedCategory = null
    document.getElementById("contentEditor").style.display = "none"
    document.getElementById("selectedCategoryName").textContent = "Ninguna seleccionada"
    document.getElementById("generateCodeBtn").disabled = true
  }
  showNotification("Categoría eliminada de Supabase", "success")
  await loadCategories()
}

function selectCategory(key) {
  gameState.selectedCategory = key
  loadCategoryData()
  loadCategoriesDisplay()
  document.getElementById("contentEditor").style.display = "block"
  document.getElementById("selectedCategoryName").textContent = gameState.categories[key].name
  document.getElementById("generateCodeBtn").disabled = false
}

// --- EDITOR DE CONTENIDO (ADMIN) ---
function loadCategoryData() {
  if (!gameState.selectedCategory) return
  const category = gameState.categories[gameState.selectedCategory]
  document.getElementById("readingText").value = category.readingText
  gameState.gameData = {
    readingText: category.readingText,
    questions: structuredClone(category.questions || []),
  }
  loadQuestionsEditor()
  updateTextStats()
}

async function saveAdminData() {
  if (!gameState.selectedCategory) return
  const key = gameState.selectedCategory
  
  // Actualizar el objeto en gameState antes de guardar
  gameState.categories[key].readingText = document.getElementById("readingText").value;
  gameState.categories[key].questions = gameState.gameData.questions;

  const { error } = await supabaseClient.from("categories").update({
    readingText: gameState.categories[key].readingText,
    questions: gameState.categories[key].questions,
  }).eq("key", key)

  if (error) return showNotification(`Error al guardar: ${error.message}`, "error")

  showNotification("Cambios guardados en Supabase", "success")
}

function loadQuestionsEditor() {
  const container = document.getElementById("questionsContainer")
  container.innerHTML = ""
  if (!gameState.gameData.questions) gameState.gameData.questions = [];
  gameState.gameData.questions.forEach((q, i) => {
    const questionDiv = document.createElement("div")
    questionDiv.className = "question-item"
    questionDiv.innerHTML = `
      <div class="question-header">
        <span class="question-number">Pregunta ${i + 1}</span>
        <button class="delete-question" onclick="removeQuestion(${i})">🗑️</button>
      </div>
      <div class="question-content">
        <textarea class="question-input" onchange="updateQuestion(${i}, 'question', this.value)">${q.question}</textarea>
        <div class="options-grid">
          ${q.options.map((opt, optIdx) => `
            <div class="option-row">
              <input type="radio" name="correct_${i}" ${q.correct === optIdx ? "checked" : ""} onchange="updateQuestion(${i}, 'correct', ${optIdx})">
              <input type="text" class="option-input" value="${opt}" onchange="updateQuestionOption(${i}, ${optIdx}, this.value)">
            </div>`).join("")}
        </div>
        <textarea class="explanation-input" onchange="updateQuestion(${i}, 'explanation', this.value)">${q.explanation}</textarea>
      </div>`
    container.appendChild(questionDiv)
  })
}

function updateQuestion(index, field, value) {
  gameState.gameData.questions[index][field] = value
}

function updateQuestionOption(questionIndex, optionIndex, value) {
  gameState.gameData.questions[questionIndex].options[optionIndex] = value
}

function addQuestion() {
  if (!gameState.gameData.questions) gameState.gameData.questions = [];
  gameState.gameData.questions.push({ question: "", options: ["", "", "", ""], correct: 0, explanation: "" })
  loadQuestionsEditor()
}

function removeQuestion(index) {
  gameState.gameData.questions.splice(index, 1)
  loadQuestionsEditor()
}

// --- CONTROL DE SALA (ADMIN) ---
async function generateRoomCode() {
  if (!gameState.selectedCategory) return alert("Por favor selecciona una categoría primero")
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { error } = await supabaseClient.from("room_codes").insert([{ code, category_key: gameState.selectedCategory, expires_at: expiresAt }])
  if (error) return showNotification(`Error al generar código: ${error.message}`, "error")
  gameState.roomCode = code
  gameState.codeExpiration = new Date(expiresAt).getTime()
  document.getElementById("currentRoomCode").textContent = code
  startCodeTimer()
  showNotification(`Código generado: ${code}`, "success")
}

function startCodeTimer() {
  if (gameState.codeTimer) clearInterval(gameState.codeTimer)
  gameState.codeTimer = setInterval(() => {
    const timeLeft = gameState.codeExpiration - Date.now()
    if (timeLeft <= 0) {
      clearInterval(gameState.codeTimer)
      document.getElementById("currentRoomCode").textContent = "-"
      document.getElementById("codeTimeLeft").textContent = "-"
    } else {
      const minutes = Math.floor(timeLeft / 60000)
      const seconds = Math.floor((timeLeft % 60000) / 1000)
      document.getElementById("codeTimeLeft").textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`
    }
  }, 1000)
}

function copyRoomCode() {
  const code = document.getElementById("currentRoomCode").textContent.trim()
  if (!code || code === "-") return showNotification("No hay código para copiar", "warning")
  navigator.clipboard.writeText(code).then(() => showNotification("Código copiado", "success"))
}

// --- FLUJO DEL JUEGO (ESTUDIANTE) ---
function startReading() {
  showScreen("readingScreen")
  document.getElementById("readingTitle").textContent = gameState.categories[gameState.selectedCategory]?.name || ""
  const teleprompter = document.getElementById("teleprompterText")
  teleprompter.innerHTML = gameState.gameData.readingText.split("\n").map((line) => `<div class="py-1">${line}</div>`).join("")

  let timeLeft = gameState.readingTime
  document.getElementById("timeLeft").textContent = timeLeft
  const timer = setInterval(() => {
    timeLeft--
    document.getElementById("timeLeft").textContent = timeLeft
    document.getElementById("progressFill").style.width = `${((gameState.readingTime - timeLeft) / gameState.readingTime) * 100}%`
    if (timeLeft <= 0) {
      clearInterval(timer)
      showQuestions()
    }
  }, 1000)
}

function showQuestions() {
  showScreen("questionsScreen")
  const container = document.getElementById("questionsDisplay")
  container.innerHTML = ""
  gameState.gameData.questions.forEach((q, i) => {
    const questionDiv = document.createElement("div")
    questionDiv.className = "question-display"
    questionDiv.innerHTML = `
      <h3>Pregunta ${i + 1}: ${q.question}</h3>
      <div class="options-list">
        ${q.options.map((opt, optIdx) => `<label class="option-label"><input type="radio" name="question_${i}" value="${optIdx}">${opt}</label>`).join("")}
      </div>`
    container.appendChild(questionDiv)
  })
  document.getElementById("submitAnswers").style.display = "block"
}

function submitAnswers() {
  gameState.userAnswers = gameState.gameData.questions.map((q, i) => {
    const selected = document.querySelector(`input[name="question_${i}"]:checked`)
    return selected ? Number.parseInt(selected.value) : -1
  })
  showResults()
}

function showResults() {
  showScreen("resultsScreen")
  const container = document.getElementById("resultsDisplay")
  container.innerHTML = ""
  let correctCount = 0
  gameState.gameData.questions.forEach((q, i) => {
    const isCorrect = gameState.userAnswers[i] === q.correct
    if (isCorrect) correctCount++
  })
  const scoreDiv = document.createElement("div")
  scoreDiv.innerHTML = `<h2>Puntuación Final: ${correctCount} / ${gameState.gameData.questions.length}</h2>`
  container.appendChild(scoreDiv)
}

function restartGame() {
  showScreen(gameState.isAdmin ? "adminScreen" : "studentLoginScreen")
}

// --- UTILIDADES ---
function showNotification(message, type = "success") {
  const notif = document.createElement("div")
  notif.className = `notification show ${type}`
  notif.textContent = message
  document.body.appendChild(notif)
  setTimeout(() => {
    notif.classList.remove("show")
    setTimeout(() => notif.remove(), 300)
  }, 2500)
}

function showUserHeader(userName) {
  document.getElementById("currentUserName").textContent = userName
  document.getElementById("userHeader").classList.remove("d-none")
}

function hideUserHeader() {
  document.getElementById("userHeader").classList.add("d-none")
}

function updateTextStats() {
  const text = document.getElementById("readingText").value
  document.getElementById("textLength").textContent = `${text.length} caracteres`
}

// Funciones de Importar/Exportar (pueden ser útiles para backups)
function exportData() {
  const dataToExport = {
    categories: gameState.categories,
  }
  const dataStr = JSON.stringify(dataToExport, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(dataBlob)
  link.download = `backup-lectura-${new Date().toISOString().split("T")[0]}.json`
  link.click()
  showNotification("Backup exportado como JSON", "info")
}

function importData() {
  document.getElementById("importFile").click()
}

async function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const importedData = JSON.parse(e.target.result)
      if (importedData.categories) {
        for (const key in importedData.categories) {
          const category = importedData.categories[key]
          await supabaseClient.from("categories").upsert(category)
        }
        showNotification("Datos importados y guardados en Supabase", "success")
        await loadCategories()
      } else {
        alert("Archivo JSON no válido")
      }
    } catch (error) {
      alert("Error al leer el archivo JSON")
    }
  }
  reader.readAsText(file)
}


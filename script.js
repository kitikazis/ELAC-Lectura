// Estado global de la aplicación
const gameState = {
  currentUser: null,
  isAdmin: false,
  roomCode: null,
  codeExpiration: null,
  codeTimer: null,
  selectedCategory: null,
  readingTime: 60,
  questions: [],
  userAnswers: [],
  categories: {
    // Categorías por defecto
    biologia: {
      name: "Biología",
      readingText:
        "La célula es la unidad básica de la vida. Todas las formas de vida están compuestas por una o más células. Las células pueden ser procariotas (sin núcleo definido) como las bacterias, o eucariotas (con núcleo definido) como las células animales y vegetales. La membrana celular controla lo que entra y sale de la célula, mientras que el citoplasma es el medio donde ocurren las reacciones químicas. En las células eucariotas, el núcleo contiene el ADN que dirige todas las actividades celulares.",
      questions: [
        {
          question: "¿Cuál es la unidad básica de la vida?",
          options: ["El átomo", "La célula", "El tejido", "El órgano"],
          correct: 1,
          explanation:
            "La célula es considerada la unidad básica de la vida porque es la estructura más pequeña que puede realizar todas las funciones vitales.",
        },
        {
          question: "¿Qué tipo de células NO tienen núcleo definido?",
          options: ["Eucariotas", "Procariotas", "Animales", "Vegetales"],
          correct: 1,
          explanation: "Las células procariotas, como las bacterias, no tienen un núcleo definido por una membrana.",
        },
      ],
    },
    tecnologia: {
      name: "Tecnología",
      readingText:
        "La inteligencia artificial (IA) es una rama de la informática que busca crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana. Esto incluye el aprendizaje, el razonamiento, la percepción y la toma de decisiones. El machine learning es una subdisciplina de la IA que permite a las máquinas aprender patrones a partir de datos sin ser programadas explícitamente. Las redes neuronales artificiales están inspiradas en el funcionamiento del cerebro humano y son fundamentales en el deep learning.",
      questions: [
        {
          question: "¿Qué busca crear la inteligencia artificial?",
          options: ["Robots físicos", "Sistemas inteligentes", "Computadoras más rápidas", "Videojuegos"],
          correct: 1,
          explanation:
            "La IA busca crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana.",
        },
        {
          question: "¿En qué se inspiran las redes neuronales artificiales?",
          options: ["En las plantas", "En el cerebro humano", "En los océanos", "En las montañas"],
          correct: 1,
          explanation:
            "Las redes neuronales artificiales están inspiradas en el funcionamiento del cerebro humano y sus conexiones neuronales.",
        },
      ],
    },
  },
  gameData: {
    readingText: "",
    questions: [],
  },
}

// Funciones de administración integradas
function initAdmin() {
  // Verificar código de sala actual y su expiración
  const savedRoomCode = localStorage.getItem("currentRoomCode")
  const savedExpiration = localStorage.getItem("codeExpiration")
  const activeCategory = localStorage.getItem("activeCategory")

  if (savedRoomCode && savedExpiration && activeCategory) {
    const expiration = Number.parseInt(savedExpiration)
    if (Date.now() < expiration) {
      gameState.roomCode = savedRoomCode
      gameState.codeExpiration = expiration
      gameState.selectedCategory = activeCategory
      document.getElementById("currentRoomCode").textContent = savedRoomCode
      loadCategoryData()
      startCodeTimer()
    } else {
      // Código expirado, limpiar
      localStorage.removeItem("currentRoomCode")
      localStorage.removeItem("codeExpiration")
      localStorage.removeItem("activeCategory")
    }
  }

  loadCategoriesDisplay()
  setupTextEditor()
}

function loadCategoriesDisplay() {
  const container = document.getElementById("categoriesList")
  container.innerHTML = ""

  Object.keys(gameState.categories).forEach((key) => {
    const category = gameState.categories[key]
    const categoryDiv = document.createElement("div")
    categoryDiv.className = `category-item ${gameState.selectedCategory === key ? "active" : ""}`
    categoryDiv.innerHTML = `
            <div class="category-info">
                <h5>${category.name}</h5>
                <div class="category-stats">
                    ${category.questions.length} preguntas | 
                    ${category.readingText.length} caracteres
                </div>
            </div>
            <div class="category-actions">
                <button class="select-btn" onclick="selectCategory('${key}')">
                    ${gameState.selectedCategory === key ? "✓ Activa" : "Seleccionar"}
                </button>
                <button class="delete-btn" onclick="deleteCategory('${key}')">🗑️</button>
            </div>
        `
    container.appendChild(categoryDiv)
  })
}

function selectCategory(key) {
  gameState.selectedCategory = key
  loadCategoryData()
  loadCategoriesDisplay()

  // Mostrar editor de contenido
  document.getElementById("contentEditor").style.display = "block"
  document.getElementById("selectedCategoryName").textContent = gameState.categories[key].name
  document.getElementById("generateCodeBtn").disabled = false
}

function setupTextEditor() {
  const textArea = document.getElementById("readingText")
  textArea.addEventListener("input", () => updateTextStats())
}

function updateTextStats() {
  const text = document.getElementById("readingText").value
  const charCount = text.length
  const wordCount = text.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200) // 200 palabras por minuto promedio

  document.getElementById("textLength").textContent = `${charCount} caracteres`
  document.getElementById("readingTimeEst").textContent = `~${readingTime} min lectura`
}

function loadCategoryData() {
  if (!gameState.selectedCategory) return

  const category = gameState.categories[gameState.selectedCategory]

  // Cargar datos en el editor
  document.getElementById("readingText").value = category.readingText
  gameState.gameData = {
    readingText: category.readingText,
    questions: [...category.questions],
  }

  loadQuestionsEditor()
  updateTextStats()
}

function loadQuestionsEditor() {
  const container = document.getElementById("questionsContainer")
  container.innerHTML = ""

  gameState.gameData.questions.forEach((question, index) => {
    const questionDiv = document.createElement("div")
    questionDiv.className = "question-item"
    questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">Pregunta ${index + 1}</span>
                <div class="question-actions">
                    <button class="move-up" onclick="moveQuestion(${index}, -1)" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button class="move-down" onclick="moveQuestion(${index}, 1)" ${index === gameState.gameData.questions.length - 1 ? "disabled" : ""}>↓</button>
                    <button class="delete-question" onclick="removeQuestion(${index})">🗑️</button>
                </div>
            </div>
            <div class="question-content">
                <textarea class="question-input" placeholder="Escribe tu pregunta aquí..." onchange="updateQuestion(${index}, 'question', this.value)">${question.question}</textarea>
                <div class="options-grid">
                    ${question.options
                      .map(
                        (option, optIndex) => `
                        <div class="option-row">
                            <input type="radio" name="correct_${index}" value="${optIndex}" ${question.correct === optIndex ? "checked" : ""} onchange="updateQuestion(${index}, 'correct', ${optIndex})">
                            <span class="option-label">${String.fromCharCode(65 + optIndex)}</span>
                            <input type="text" class="option-input" placeholder="Opción ${optIndex + 1}" value="${option}" onchange="updateQuestionOption(${index}, ${optIndex}, this.value)">
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                <textarea class="explanation-input" placeholder="Explicación de la respuesta correcta..." onchange="updateQuestion(${index}, 'explanation', this.value)">${question.explanation}</textarea>
            </div>
        `
    container.appendChild(questionDiv)
  })
}

function addQuestion() {
  gameState.gameData.questions.push({
    question: "",
    options: ["", "", "", ""],
    correct: 0,
    explanation: "",
  })
  loadQuestionsEditor()
}

function removeQuestion(index) {
  if (confirm("¿Estás seguro de eliminar esta pregunta?")) {
    gameState.gameData.questions.splice(index, 1)
    loadQuestionsEditor()
  }
}

function moveQuestion(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= gameState.gameData.questions.length) return

  // Intercambiar preguntas
  const temp = gameState.gameData.questions[index]
  gameState.gameData.questions[index] = gameState.gameData.questions[newIndex]
  gameState.gameData.questions[newIndex] = temp

  loadQuestionsEditor()
}

function updateQuestion(index, field, value) {
  gameState.gameData.questions[index][field] = value
}

function updateQuestionOption(questionIndex, optionIndex, value) {
  gameState.gameData.questions[questionIndex].options[optionIndex] = value
}

function saveCategories() {
  localStorage.setItem("gameCategories", JSON.stringify(gameState.categories))
}

function startCodeTimer() {
  // Limpiar timer anterior si existe
  if (gameState.codeTimer) {
    clearInterval(gameState.codeTimer)
  }

  gameState.codeTimer = setInterval(() => {
    const now = Date.now()
    const timeLeft = gameState.codeExpiration - now

    if (timeLeft <= 0) {
      // Código expirado
      clearInterval(gameState.codeTimer)
      gameState.roomCode = null
      gameState.codeExpiration = null
      document.getElementById("currentRoomCode").textContent = "-"
      document.getElementById("codeTimeLeft").textContent = "-"
      localStorage.removeItem("currentRoomCode")
      localStorage.removeItem("codeExpiration")
      localStorage.removeItem("activeCategory")
      alert("El código de sala ha expirado")
    } else {
      // Mostrar tiempo restante
      const minutes = Math.floor(timeLeft / 60000)
      const seconds = Math.floor((timeLeft % 60000) / 1000)
      document.getElementById("codeTimeLeft").textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`
    }
  }, 1000)
}

async function loadDataFromJSON() {
  try {
    const response = await fetch("data.json")
    if (response.ok) {
      const data = await response.json()
      gameState.categories = data.categories
      // Merge con datos locales si existen
      const localCategories = localStorage.getItem("gameCategories")
      if (localCategories) {
        const local = JSON.parse(localCategories)
        gameState.categories = { ...gameState.categories, ...local }
      }
    }
  } catch (error) {
    console.log("[v0] No se pudo cargar data.json, usando datos por defecto")
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadDataFromJSON()
  loadGameData()
  loadCategories()
  showScreen("loginScreen")
})

// Funciones de navegación entre pantallas
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active")
  })
  document.getElementById(screenId).classList.add("active")
}

// Funciones de autenticación
function login() {
  const user = document.getElementById("loginUser").value
  const pass = document.getElementById("loginPass").value

  if (user === "Leonardo" && pass === "0000001") {
    gameState.currentUser = user
    gameState.isAdmin = true
    initAdmin()
    showScreen("adminScreen")
  } else {
    alert("Credenciales incorrectas")
  }
}

function showStudentLogin() {
  showScreen("studentLoginScreen")
}

function showLogin() {
  showScreen("loginScreen")
}

function studentLogin() {
  const name = document.getElementById("studentName").value.trim()
  const roomCode = document.getElementById("studentRoomCode").value.trim()

  if (!name || !roomCode) {
    alert("Por favor completa todos los campos")
    return
  }

  const savedRoomCode = localStorage.getItem("currentRoomCode")
  const savedExpiration = localStorage.getItem("codeExpiration")
  const activeCategory = localStorage.getItem("activeCategory")

  if (!savedRoomCode || !savedExpiration || !activeCategory) {
    alert("No hay códigos de sala activos")
    return
  }

  if (Date.now() >= Number.parseInt(savedExpiration)) {
    alert("El código de sala ha expirado")
    return
  }

  if (roomCode !== savedRoomCode) {
    alert("Código de sala incorrecto")
    return
  }

  // Cargar datos de la categoría activa
  gameState.selectedCategory = activeCategory
  gameState.gameData = {
    readingText: gameState.categories[activeCategory].readingText,
    questions: [...gameState.categories[activeCategory].questions],
  }

  gameState.currentUser = name
  gameState.isAdmin = false
  startReading()
}

// Funciones del juego
function startReading() {
  showScreen("readingScreen")
  document.getElementById("readingTextDisplay").textContent = gameState.gameData.readingText

  let timeLeft = gameState.readingTime
  document.getElementById("timeLeft").textContent = timeLeft

  const timer = setInterval(() => {
    timeLeft--
    document.getElementById("timeLeft").textContent = timeLeft

    // Calcular opacidad y progreso
    const progress = ((gameState.readingTime - timeLeft) / gameState.readingTime) * 100
    const opacity = timeLeft / gameState.readingTime

    // Actualizar barra de progreso
    document.getElementById("progressFill").style.width = progress + "%"

    // Desvanecer texto gradualmente
    document.getElementById("textContainer").style.opacity = opacity

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

  gameState.gameData.questions.forEach((question, index) => {
    const questionDiv = document.createElement("div")
    questionDiv.className = "question-display"
    questionDiv.innerHTML = `
            <h3>Pregunta ${index + 1}: ${question.question}</h3>
            <div class="options-list">
                ${question.options
                  .map(
                    (option, optIndex) => `
                    <label class="option-label">
                        <input type="radio" name="question_${index}" value="${optIndex}">
                        ${option}
                    </label>
                `,
                  )
                  .join("")}
            </div>
        `
    container.appendChild(questionDiv)
  })

  document.getElementById("submitAnswers").style.display = "block"
}

function submitAnswers() {
  gameState.userAnswers = []

  gameState.gameData.questions.forEach((question, index) => {
    const selected = document.querySelector(`input[name="question_${index}"]:checked`)
    gameState.userAnswers.push(selected ? Number.parseInt(selected.value) : -1)
  })

  showResults()
}

function showResults() {
  showScreen("resultsScreen")
  const container = document.getElementById("resultsDisplay")
  container.innerHTML = ""

  let correctCount = 0

  gameState.gameData.questions.forEach((question, index) => {
    const userAnswer = gameState.userAnswers[index]
    const isCorrect = userAnswer === question.correct
    if (isCorrect) correctCount++

    const resultDiv = document.createElement("div")
    resultDiv.className = `results-item ${isCorrect ? "correct" : "incorrect"}`
    resultDiv.innerHTML = `
            <h3>Pregunta ${index + 1}: ${question.question}</h3>
            <p><strong>Tu respuesta:</strong> ${userAnswer >= 0 ? question.options[userAnswer] : "No respondida"}</p>
            <p><strong>Respuesta correcta:</strong> ${question.options[question.correct]}</p>
            <p><strong>Estado:</strong> ${isCorrect ? "✅ Correcta" : "❌ Incorrecta"}</p>
            <div class="explanation">
                <strong>Explicación:</strong> ${question.explanation}
            </div>
        `
    container.appendChild(resultDiv)
  })

  // Mostrar puntuación final
  const scoreDiv = document.createElement("div")
  scoreDiv.className = "results-item"
  scoreDiv.style.background = "#e6fffa"
  scoreDiv.style.borderLeft = "4px solid #38b2ac"
  scoreDiv.innerHTML = `
        <h2>Puntuación Final</h2>
        <p style="font-size: 24px; text-align: center; margin: 20px 0;">
            ${correctCount} / ${gameState.gameData.questions.length}
        </p>
        <p style="text-align: center;">
            ${Math.round((correctCount / gameState.gameData.questions.length) * 100)}% de respuestas correctas
        </p>
    `
  container.insertBefore(scoreDiv, container.firstChild)
}

function restartGame() {
  gameState.userAnswers = []
  if (gameState.isAdmin) {
    showScreen("adminScreen")
  } else {
    showScreen("roomScreen")
  }
}

// Funciones de persistencia de datos
function saveGameData() {
  localStorage.setItem("gameData", JSON.stringify(gameState.gameData))
}

function loadGameData() {
  const saved = localStorage.getItem("gameData")
  if (saved) {
    gameState.gameData = JSON.parse(saved)
  }
}

function loadCategories() {
  const saved = localStorage.getItem("gameCategories")
  if (saved) {
    gameState.categories = JSON.parse(saved)
  }
}

function createCategory() {
  const name = document.getElementById("newCategoryName").value.trim()
  if (!name) {
    alert("Por favor ingresa un nombre para la categoría")
    return
  }

  const key = name.toLowerCase().replace(/\s+/g, "_")
  gameState.categories[key] = {
    name: name,
    readingText: "",
    questions: [],
  }

  saveCategories()
  loadCategoriesDisplay()
  document.getElementById("newCategoryName").value = ""
  alert("Categoría creada exitosamente")
}

function deleteCategory(key) {
  if (confirm(`¿Estás seguro de eliminar la categoría "${gameState.categories[key].name}"?`)) {
    delete gameState.categories[key]
    saveCategories()
    loadCategoriesDisplay()

    // Si era la categoría seleccionada, limpiar selección
    if (gameState.selectedCategory === key) {
      gameState.selectedCategory = null
      document.getElementById("contentEditor").style.display = "none"
      document.getElementById("selectedCategoryName").textContent = "Ninguna seleccionada"
      document.getElementById("generateCodeBtn").disabled = true
    }

    alert("Categoría eliminada")
  }
}

function showTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active")
  })
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Mostrar pestaña seleccionada
  document.getElementById(tabName + "Tab").classList.add("active")
  event.target.classList.add("active")
}

function previewContent() {
  if (!gameState.selectedCategory) {
    alert("Selecciona una categoría primero")
    return
  }

  const category = gameState.categories[gameState.selectedCategory]
  const preview = `
        CATEGORÍA: ${category.name}
        
        TEXTO DE LECTURA:
        ${category.readingText}
        
        PREGUNTAS (${category.questions.length}):
        ${category.questions
          .map(
            (q, i) => `
        ${i + 1}. ${q.question}
           a) ${q.options[0]}
           b) ${q.options[1]}
           c) ${q.options[2]}
           d) ${q.options[3]}
           Respuesta correcta: ${String.fromCharCode(97 + q.correct)}) ${q.options[q.correct]}
           Explicación: ${q.explanation}
        `,
          )
          .join("\n")}
    `

  alert(preview)
}

function exportData() {
  const dataToExport = {
    categories: gameState.categories,
    users: JSON.parse(localStorage.getItem("registeredUsers") || "{}"),
    settings: {
      readingTime: gameState.readingTime,
      codeExpiration: 300000,
    },
    exportDate: new Date().toISOString(),
  }

  const dataStr = JSON.stringify(dataToExport, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })

  const link = document.createElement("a")
  link.href = URL.createObjectURL(dataBlob)
  link.download = `juego-lectura-${new Date().toISOString().split("T")[0]}.json`
  link.click()

  alert("Datos exportados correctamente")
}

function importData() {
  document.getElementById("importFile").click()
}

function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result)

      if (importedData.categories) {
        gameState.categories = importedData.categories
        saveCategories()
        loadCategoriesDisplay()
        alert("Datos importados correctamente")
      } else {
        alert("Archivo JSON no válido")
      }
    } catch (error) {
      alert("Error al leer el archivo JSON")
    }
  }
  reader.readAsText(file)
}

function generateRoomCode() {
  if (!gameState.selectedCategory) {
    alert("Por favor selecciona una categoría primero")
    return
  }

  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  gameState.roomCode = code
  gameState.codeExpiration = Date.now() + 5 * 60 * 1000 // 5 minutos

  document.getElementById("currentRoomCode").textContent = code
  localStorage.setItem("currentRoomCode", code)
  localStorage.setItem("codeExpiration", gameState.codeExpiration.toString())
  localStorage.setItem("activeCategory", gameState.selectedCategory)

  startCodeTimer()
  alert(
    `Código generado: ${code}\nCategoría: ${gameState.categories[gameState.selectedCategory].name}\nDuración: 5 minutos`,
  )
}

function saveAdminData() {
  if (!gameState.selectedCategory) {
    alert("Por favor selecciona una categoría primero")
    return
  }

  const readingText = document.getElementById("readingText").value
  if (!readingText.trim()) {
    alert("Por favor ingresa un texto de lectura")
    return
  }

  if (gameState.gameData.questions.length === 0) {
    alert("Por favor agrega al menos una pregunta")
    return
  }

  // Validar que todas las preguntas estén completas
  for (let i = 0; i < gameState.gameData.questions.length; i++) {
    const q = gameState.gameData.questions[i]
    if (!q.question.trim() || q.options.some((opt) => !opt.trim()) || !q.explanation.trim()) {
      alert(`Por favor completa todos los campos de la pregunta ${i + 1}`)
      return
    }
  }

  gameState.categories[gameState.selectedCategory].readingText = readingText
  gameState.categories[gameState.selectedCategory].questions = [...gameState.gameData.questions]

  saveCategories()
  loadCategoriesDisplay()
  alert("Datos guardados correctamente")
}

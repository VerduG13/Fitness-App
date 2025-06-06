// script.js

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initLoginSignup();
  initForm();
  initCharts();
  initHistorico();
  setupLogout();
  initConfig();
  startReminderLoop();
});

function checkSession() {
  const userId = sessionStorage.getItem('userId');
  const appContent = document.getElementById('app-content');
  const loginSection = document.getElementById('login-section');
  const signupSection = document.getElementById('signup-section');
  const logoutBtn = document.getElementById('logout');

  if (userId) {
    loginSection.style.display = 'none';
    signupSection.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    appContent.style.display = 'block';
  } else {
    loginSection.style.display = 'block';
    signupSection.style.display = 'none';
    logoutBtn.style.display = 'none';
    appContent.style.display = 'none';
  }
}

function initLoginSignup() {
  // Mostrar formulario de registro desde login
  document.getElementById('show-signup').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'block';
  });

  // Mostrar formulario de login desde signup
  document.getElementById('show-login').addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
  });

  // Registro de usuario
  const signupForm = document.getElementById('signup-form');
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    const signupError = document.getElementById('signup-error');
    signupError.textContent = '';

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:8080/user/create', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ email, password }));

      if (xhr.status === 201) {
        const json = JSON.parse(xhr.responseText);
        sessionStorage.setItem('userId', json.id);
        sessionStorage.setItem('userEmail', json.email)
        checkSession();
      } else if (xhr.status === 409) {
        signupError.textContent = 'Ese correo ya está en uso.';
      } else {
        signupError.textContent = 'Error inesperado. Intenta de nuevo.';
      }
    } catch (err) {
      signupError.textContent = 'No se pudo conectar al servidor.';
    }
  });

  // Login de usuario
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:8080/user/auth', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ email, password }));

      if (xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        sessionStorage.setItem('userId', json.id);
        sessionStorage.setItem('userEmail', json.email);
        checkSession();
      } else {
        loginError.textContent = 'Email o contraseña incorrectos.';
      }
    } catch (err) {
      loginError.textContent = 'No se pudo conectar al servidor.';
    }
  });
}


function initForm() {
  const form = document.getElementById('registro-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
  
    const hoy = new Date().toISOString().slice(0, 10);
    const registro = {
      registrationDate: hoy,
      water: Number(form.agua.value),
      exercise: Number(form.ejercicio.value),
      sleep: Number(form.sueno.value),
      moodScore: Number(form.animo.value)
    };

    try {
      saveRegistro(registro); 
      form.reset();
      updateAllCharts();
    } catch {
      
    }
  });
}

//Retorna un array de objetos fecha, agua, ejercicio, sueno, animo
function getRegistros() {
  const userId = sessionStorage.getItem('userId');
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `http://localhost:8080/habit/user/${userId}`, false);
  xhr.send(null);

  if (xhr.status === 200) {
    return JSON.parse(xhr.responseText);
  } else {
    throw new Error('Error al obtener registros');
  }
}

function getChartData() {
  const userId = sessionStorage.getItem('userId');
  const hoy = new Date();
  const date = hoy.toISOString().slice(0, 10);
  const body = { userId, date };
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `http://localhost:8080/habit/chartData`, false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(body));

  if (xhr.status === 200) {
    return JSON.parse(xhr.responseText);
  } else {
    throw new Error('Error al obtener registros');
  }
}


function saveRegistro(registro) {
  const userId = sessionStorage.getItem('userId');
  const body = { ...registro, userId };
  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8080/habit/create', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(body));

  if (xhr.status === 200 || xhr.status === 201) {
    // Éxito: mostramos un popup
    alert('Hábito registrado correctamente');
  } else {
    // Error: intentamos leer el mensaje de la respuesta
    let errorMsg = 'Error al guardar registro';
    try {
      const json = JSON.parse(xhr.responseText);
      if (json.errorMessage) {
        errorMsg = json.errorMessage;
      }
    } catch (e) {
      if (xhr.responseText) {
        errorMsg = xhr.responseText;
      }
    }
    alert(errorMsg);
    throw new Error(errorMsg);
  }
}

function initHistorico() {
  const tbody = document.getElementById('historico-body');
  if (!tbody) return;

  let registros = [];
  try {
    registros = getRegistros(); 
  } catch {
    console.error('No se pudieron cargar registros históricos.');
    return;
  }

  tbody.innerHTML = '';
  registros.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.registrationDate}</td>
      <td>${r.water.toFixed(1)}</td>
      <td>${r.exercise}</td>
      <td>${r.sleep.toFixed(1)}</td>
      <td>${r.moodScore}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Leer colores de CSS
const rs = getComputedStyle(document.documentElement);
const colorAgua    = rs.getPropertyValue('--color-agua').trim();
const colorEjStart = rs.getPropertyValue('--color-ejercicio-start').trim();
const colorSueno   = rs.getPropertyValue('--color-sueno').trim();
const colorAnimo   = rs.getPropertyValue('--color-animo').trim();

let charts = {};

function initCharts() {
  // Gráfico de Agua
  const ctxAgua = document.getElementById('chart-agua');
  if (ctxAgua) {
    charts.agua = new Chart(ctxAgua, {
      type: 'bar',
      data: {
        labels: [], // se llenará con fechas (ayer, hoy)
        datasets: [{ label: 'Agua (L)', data: [], backgroundColor: colorAgua }]
      },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { title: { display: true, text: 'Fecha' } }
        }
      }
    });
  }

  // Gráfico de Ejercicio
  const ctxEj = document.getElementById('chart-ejercicio');
  if (ctxEj) {
    charts.ejercicio = new Chart(ctxEj, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{ label: 'Ejercicio (min)', data: [], backgroundColor: colorEjStart }]
      },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { title: { display: true, text: 'Fecha' } }
        }
      }
    });
  }

  // Gráfico de Sueño
  const ctxSu = document.getElementById('chart-sueno');
  if (ctxSu) {
    charts.sueno = new Chart(ctxSu, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{ label: 'Sueño (h)', data: [], backgroundColor: colorSueno }]
      },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { title: { display: true, text: 'Fecha' } }
        }
      }
    });
  }

  // Gráfico de Animo
  const ctxAn = document.getElementById('chart-animo');
  if (ctxAn) {
    charts.animo = new Chart(ctxAn, {
      type: 'bar',
      data: {
        labels: [], 
        datasets: [{
          label: 'Ánimo',
          data: [],             
          backgroundColor: colorAnimo,
          borderColor: colorAnimo,
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true },
          x: { title: { display: true, text: 'Fecha' } }
        }
      }
    });
  }
  updateAllCharts();
}

function updateAllCharts() {
  let chartData = undefined;
  try {
    chartData = getChartData();
  } catch {
    console.error('Fallo al cargar registros para gráficas');
    return;
  }
  const fechas = chartData.dates;

  // Actualizar gráfica de Agua
  if (charts.agua) {
    charts.agua.data.labels = fechas;
    charts.agua.data.datasets[0].data = chartData.water;
    charts.agua.update();
  }

  // Actualizar gráfica de Ejercicio
  if (charts.ejercicio) {
    charts.ejercicio.data.labels = fechas;
    charts.ejercicio.data.datasets[0].data = chartData.exercise;
    charts.ejercicio.update();
  }

  // Actualizar gráfica de Sueño
  if (charts.sueno) {
    charts.sueno.data.labels = fechas;
    charts.sueno.data.datasets[0].data = chartData.sleep;
    charts.sueno.update();
  }

  // Actualizar gráfica de Ánimo
  if (charts.animo) {
    charts.animo.data.labels = fechas;
    charts.animo.data.datasets[0].data = chartData.mood;
    charts.animo.update();
  }
}

function setupLogout() {
  const btnLogout = document.getElementById('logout');
  if (!btnLogout) return;
  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    checkSession();
  });
}

const EMAIL_SERVICE   = 'service_t1r6yji';
const EMAIL_TEMPLATE  = 'template_noo02xb';
const EMAIL_PUBLICKEY = '77nm1jj0tkky0hsTt';

function sendReminderEmail(toEmail, habitName, habitValue, habitMeasure) { 
  const params = { to_email: toEmail, habit_name: habitName, habit_value: habitValue, habit_measure: habitMeasure };
  emailjs.send(EMAIL_SERVICE, EMAIL_TEMPLATE, params, EMAIL_PUBLICKEY)
    .then(resp => console.log('EmailJS OK', resp.status))
    .catch(err  => console.error('EmailJS error', err));
}

function initConfig() {
  const cfgForm = document.getElementById('config-form');
  if (!cfgForm) return;

  cfgForm.addEventListener('submit', e => {
    e.preventDefault();
    const cfg = {
      aguaHora:             cfgForm['recordatorio-agua'].value,
      aguaMeta:             cfgForm['meta-agua'].value,
      ejercicioHora:        cfgForm['recordatorio-ejercicio'].value,
      ejercicioMeta:        cfgForm['meta-ejercicio'].value,
      suenoHora:            cfgForm['recordatorio-sueno'].value,
      suenoMeta:            cfgForm['meta-sueno'].value,
    };
    localStorage.setItem('habit-reminders', JSON.stringify(cfg));
    alert('Recordatorios guardados ✅');
  });

  // Rellenar campos al abrir la página
  const stored = JSON.parse(localStorage.getItem('habit-reminders') || '{}');
  if (stored.aguaHora)      cfgForm['recordatorio-agua'].value      = stored.aguaHora;
  if (stored.aguaMeta)      cfgForm['meta-agua'].value      = stored.aguaMeta;
  if (stored.ejercicioHora) cfgForm['recordatorio-ejercicio'].value = stored.ejercicioHora;
  if (stored.ejercicioMeta) cfgForm['meta-ejercicio'].value = stored.ejercicioMeta;
  if (stored.suenoHora)     cfgForm['recordatorio-sueno'].value     = stored.suenoHora;
  if (stored.suenoMeta)     cfgForm['meta-sueno'].value     = stored.suenoMeta;
}

function startReminderLoop() {
  setInterval(() => {
    const rems = JSON.parse(localStorage.getItem('habit-reminders') || '{}');
    const now  = new Date().toTimeString().slice(0, 5);
    const email= sessionStorage.getItem('userEmail');
    if (!email) return;
    if (rems.aguaHora === now)      sendReminderEmail(email, 'agua', rems.aguaMeta, 'litros');
    if (rems.ejercicioHora === now) sendReminderEmail(email, 'ejercicio', rems.ejercicioMeta, 'minutos');
    if (rems.suenoHora === now)     sendReminderEmail(email, 'sueño', rems.suenoMeta, 'horas');
  }, 60 * 1000);
}
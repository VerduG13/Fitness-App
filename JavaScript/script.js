// script.js

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initLoginSignup();
  initForm();
  initCharts();
  initHistorico();
  setupLogout();
});

/**
 * Controla qué secciones se muestran según exista o no userId en sessionStorage.
 */
function checkSession() {
  const userId = sessionStorage.getItem('userId');
  const appContent = document.getElementById('app-content');
  const loginSection = document.getElementById('login-section');
  const signupSection = document.getElementById('signup-section');
  const logoutBtn = document.getElementById('logout');

  if (userId) {
    // Usuario logueado
    loginSection.style.display = 'none';
    signupSection.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    appContent.style.display = 'block';
  } else {
    // Sin sesión
    loginSection.style.display = 'block';
    signupSection.style.display = 'none';
    logoutBtn.style.display = 'none';
    appContent.style.display = 'none';
  }
}

/**
 * Inicializa lógica de los formularios de login y signup, así como mostrar/ocultar secciones.
 */
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
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    const signupError = document.getElementById('signup-error');
    signupError.textContent = '';

    try {
      const resp = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (resp.status === 201) {
        const json = await resp.json();
        sessionStorage.setItem('userId', json.id);
        checkSession();
      } else if (resp.status === 409) {
        signupError.textContent = 'Ese correo ya está en uso.';
      } else {
        signupError.textContent = 'Error inesperado. Intenta de nuevo.';
      }
    } catch {
      signupError.textContent = 'No se pudo conectar al servidor.';
    }
  });

  // Login de usuario
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (resp.status === 200) {
        const json = await resp.json();
        sessionStorage.setItem('userId', json.id);
        checkSession();
      } else {
        loginError.textContent = 'Email o contraseña incorrectos.';
      }
    } catch {
      loginError.textContent = 'No se pudo conectar al servidor.';
    }
  });
}

/**
 * Inicializa el formulario de registro de hábitos para enviarlo al backend.
 */
function initForm() {
  const form = document.getElementById('registro-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const hoy = new Date().toISOString().slice(0, 10);
    let registros = [];
    try {
      registros = await getRegistros();
    } catch {
      alert('No se pudo obtener registros del servidor');
      return;
    }

    // Verificar si ya existe al menos un registro para hoy
    const existeHoy = registros.some(r => r.fecha === hoy);
    if (existeHoy) {
      const confirmar = confirm(
        'Ya tienes un registro para la fecha de hoy, ¿quieres añadir otro?'
      );
      if (!confirmar) return;
    }

    // Construir el objeto registro
    const registro = {
      fecha: hoy,
      agua: Number(form.agua.value),
      ejercicio: Number(form.ejercicio.value),
      sueno: Number(form.sueno.value),
      animo: Number(form.animo.value)
    };

    try {
      await saveRegistro(registro);
      form.reset();
      updateAllCharts();
    } catch {
      alert('No se pudo guardar el registro en el servidor.');
    }
  });
}

/**
 * Obtiene todos los registros del backend para el usuario actual.
 * Retorna un array de objetos { fecha, agua, ejercicio, sueno, animo }.
 */
async function getRegistros() {
  const userId = sessionStorage.getItem('userId');
  const resp = await fetch(`/api/registros?userId=${userId}`);
  if (!resp.ok) throw new Error('Error al obtener registros');
  return await resp.json();
}

/**
 * Envía al backend un nuevo registro asociado al usuario.
 * El backend devuelve JSON con { success: true } o devuelve error.
 */
async function saveRegistro(registro) {
  const userId = sessionStorage.getItem('userId');
  const body = { ...registro, userId };
  const resp = await fetch('/api/registros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('Error al guardar registro');
  return await resp.json();
}

/**
 * Inicializa la tabla de histórico con todos los registros del usuario desde el backend.
 */
async function initHistorico() {
  const tbody = document.getElementById('historico-body');
  if (!tbody) return;

  let registros = [];
  try {
    registros = await getRegistros();
  } catch {
    console.error('No se pudieron cargar registros históricos.');
    return;
  }

  tbody.innerHTML = '';
  registros.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.agua.toFixed(1)}</td>
      <td>${r.ejercicio}</td>
      <td>${r.sueno.toFixed(1)}</td>
      <td>${r.animo}</td>
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
/**
 * Configura las cuatro gráficas: tres de barras (agua, ejercicio, sueño) y un scatter (ánimo).
 */
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

  // Gráfico de Ánimo (scatter con línea)
  const ctxAn = document.getElementById('chart-animo');
  if (ctxAn) {
    charts.animo = new Chart(ctxAn, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Ánimo',
          data: [],
          backgroundColor: colorAnimo,
          showLine: true,
          borderColor: colorAnimo,
          borderWidth: 2
        }]
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              parser: 'YYYY-MM-DD',
              unit: 'day',
              displayFormats: { day: 'MMM D' }
            },
            title: { display: true, text: 'Fecha' }
          },
          y: {
            beginAtZero: true,
            min: 0,
            max: 10,
            title: { display: true, text: 'Ánimo' }
          }
        }
      }
    });
  }

  // Carga inicial de datos
  updateAllCharts();
}

/**
 * Recupera los datos de los últimos dos días (ayer y hoy) y actualiza cada gráfico.
 */
async function updateAllCharts() {
  let registros = [];
  try {
    registros = await getRegistros();
  } catch {
    console.error('Fallo al cargar registros para gráficas');
    return;
  }

  // Fechas: hoy y ayer en formato "YYYY-MM-DD"
  const hoy = new Date();
  const strHoy = hoy.toISOString().slice(0, 10);
  const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
  const strAyer = ayer.toISOString().slice(0, 10);

  // Filtrar registros por fecha
  const regsHoy = registros.filter(r => r.fecha === strHoy);
  const regsAyer = registros.filter(r => r.fecha === strAyer);

  // Sumas diarias
  const sumaAguaHoy    = regsHoy.map(r => r.agua).reduce((s, v) => s + v, 0);
  const sumaEjHoy      = regsHoy.map(r => r.ejercicio).reduce((s, v) => s + v, 0);
  const sumaSuenoHoy   = regsHoy.map(r => r.sueno).reduce((s, v) => s + v, 0);
  const datosAnimoHoy  = regsHoy.map(r => ({ x: strHoy, y: r.animo }));

  const sumaAguaAyer    = regsAyer.map(r => r.agua).reduce((s, v) => s + v, 0);
  const sumaEjAyer      = regsAyer.map(r => r.ejercicio).reduce((s, v) => s + v, 0);
  const sumaSuenoAyer   = regsAyer.map(r => r.sueno).reduce((s, v) => s + v, 0);
  const datosAnimoAyer  = regsAyer.map(r => ({ x: strAyer, y: r.animo }));

  const fechas = [strAyer, strHoy];

  // Actualizar gráfica de Agua
  if (charts.agua) {
    charts.agua.data.labels = fechas;
    charts.agua.data.datasets[0].data = [sumaAguaAyer, sumaAguaHoy];
    charts.agua.update();
  }

  // Actualizar gráfica de Ejercicio
  if (charts.ejercicio) {
    charts.ejercicio.data.labels = fechas;
    charts.ejercicio.data.datasets[0].data = [sumaEjAyer, sumaEjHoy];
    charts.ejercicio.update();
  }

  // Actualizar gráfica de Sueño
  if (charts.sueno) {
    charts.sueno.data.labels = fechas;
    charts.sueno.data.datasets[0].data = [sumaSuenoAyer, sumaSuenoHoy];
    charts.sueno.update();
  }

  // Actualizar scatter de Ánimo
  if (charts.animo) {
    const datosAnimo = datosAnimoAyer.concat(datosAnimoHoy);
    charts.animo.data.datasets[0].data = datosAnimo;
    charts.animo.update();
  }
}

/**
 * Configura el botón de cerrar sesión.
 */
function setupLogout() {
  const btnLogout = document.getElementById('logout');
  if (!btnLogout) return;
  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('userId');
    window.location.href = 'index.html';
  });
}

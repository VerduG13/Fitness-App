
document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initCharts();
  initHistorico();
});

function initForm() {
  const form = document.getElementById('registro-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const registro = {
      fecha: new Date().toISOString().slice(0,10),
      agua: Number(form.agua.value),
      ejercicio: Number(form.ejercicio.value),
      sueno: Number(form.sueno.value),
      animo: Number(form.animo.value)
    };
    saveRegistro(registro);
    form.reset();
    updateAllCharts();
  });
}

function getRegistros() {
  return JSON.parse(localStorage.getItem('registroHabitos') || '[]');
}

function saveRegistro(registro) {
  const arr = getRegistros();
  arr.push(registro);
  localStorage.setItem('registroHabitos', JSON.stringify(arr));
}

function initHistorico() {
  const tbody = document.getElementById('historico-body');
  if (!tbody) return;
  const registros = getRegistros();
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
function initCharts() {
  const ctxAgua = document.getElementById('chart-agua');
  if (ctxAgua) {
    charts.agua = new Chart(ctxAgua, {
      type: 'bar',
      data: {
        labels: ['Agua'],
        datasets: [{ label: 'Agua', data: [0], backgroundColor: [colorAgua] }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  const ctxEj = document.getElementById('chart-ejercicio');
  if (ctxEj) {
    charts.ejercicio = new Chart(ctxEj, {
      type: 'bar',
      data: {
        labels: ['Ejercicio'],
        datasets: [{ label: 'Ejercicio', data: [0], backgroundColor: [colorEjStart] }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  const ctxSu = document.getElementById('chart-sueno');
  if (ctxSu) {
    charts.sueno = new Chart(ctxSu, {
      type: 'bar',
      data: {
        labels: ['Sueño'],
        datasets: [{ label: 'Sueño', data: [0], backgroundColor: [colorSueno] }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

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
          x: { title: { display: true, text: 'Registro #' } },
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

  updateAllCharts();
}

function updateAllCharts() {
  const registros = getRegistros();
  const hoy = new Date().toISOString().slice(0,10);
  const hoyRegs = registros.filter(r => r.fecha === hoy);

  // Totales diarios
  const totalAgua = hoyRegs.map(r => r.agua).reduce((s,v) => s+v, 0);
  const totalEj  = hoyRegs.map(r => r.ejercicio).reduce((s,v) => s+v, 0);
  const totalSu  = hoyRegs.map(r => r.sueno).reduce((s,v) => s+v, 0);

  if (charts.agua)     charts.agua.data.datasets[0].data = [totalAgua];
  if (charts.ejercicio) charts.ejercicio.data.datasets[0].data = [totalEj];
  if (charts.sueno)     charts.sueno.data.datasets[0].data = [totalSu];

  // Ánimo
  if (charts.animo) {
    charts.animo.data.datasets[0].data = registros.map((r,i) => ({ x: i+1, y: r.animo }));
  }

  Object.values(charts).forEach(c => c.update());
}

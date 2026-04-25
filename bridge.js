/**
 * JnConta Execution Bridge
 * Permite al asistente ejecutar comandos nativamente en el host (Ubuntu/Windows)
 * sin depender del sistema de sandboxing del orquestador.
 *
 * USO: node bridge.js
 * Dejar esta terminal abierta mientras trabajas con el asistente.
 */
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const CMD_FILE  = path.join(__dirname, '.bridge_cmd.json');
const OUT_DIR   = __dirname;
const LOG_FILE  = path.join(__dirname, '.bridge_log.txt');
const POLL_MS   = 500; // Revisar cada 500ms

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// Limpiar archivos previos
if (fs.existsSync(CMD_FILE)) fs.unlinkSync(CMD_FILE);

log('🌉 JnConta Execution Bridge ACTIVO');
log('📂 Carpeta raíz: ' + __dirname);
log('⏳ Esperando comandos en .bridge_cmd.json ...\n');

function poll() {
  if (!fs.existsSync(CMD_FILE)) {
    return setTimeout(poll, POLL_MS);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(CMD_FILE, 'utf8'));
  } catch {
    return setTimeout(poll, POLL_MS);
  }

  if (!data.command || !data.id) {
    return setTimeout(poll, POLL_MS);
  }

  log(`🚀 Ejecutando [${data.id}]: ${data.command}`);

  const opts = {
    cwd: data.cwd || __dirname,
    timeout: 120000, // máx 2 minutos
    maxBuffer: 1024 * 1024 * 10,
    shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
  };

  exec(data.command, opts, (error, stdout, stderr) => {
    const result = {
      id:        data.id,
      command:   data.command,
      stdout:    stdout?.trim(),
      stderr:    stderr?.trim(),
      error:     error ? error.message : null,
      exitCode:  error ? error.code : 0,
      timestamp: new Date().toISOString(),
    };

    const outFile = path.join(OUT_DIR, `.bridge_out_${data.id}.json`);
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
    fs.unlinkSync(CMD_FILE); // marcar como procesado
    log(`✅ Completado [${data.id}] | exit: ${result.exitCode}`);
    if (result.stderr) log(`⚠️  stderr: ${result.stderr.slice(0, 200)}`);
    setTimeout(poll, POLL_MS);
  });
}

poll();

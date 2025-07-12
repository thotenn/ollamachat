#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Configurando proxies CORS para desarrollo web...\n');

const proxies = [
  {
    name: 'Anthropic',
    port: 8010,
    url: 'https://api.anthropic.com/v1'
  },
  {
    name: 'OpenAI', 
    port: 8011,
    url: 'https://api.openai.com/v1'
  },
  {
    name: 'Google Gemini',
    port: 8012,
    url: 'https://generativelanguage.googleapis.com/v1beta'
  }
];

function startProxy(proxy) {
  console.log(`📡 Iniciando proxy para ${proxy.name}:`);
  console.log(`   Puerto: ${proxy.port}`);
  console.log(`   URL: ${proxy.url}`);
  console.log(`   Proxy: http://localhost:${proxy.port}`);
  
  const process = spawn('npx', [
    'local-cors-proxy',
    '--proxyUrl', proxy.url,
    '--port', proxy.port.toString(),
    '--credentials'
  ], {
    stdio: 'pipe'
  });

  process.stdout.on('data', (data) => {
    console.log(`[${proxy.name}:${proxy.port}] ${data.toString().trim()}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`[${proxy.name}:${proxy.port}] ❌ ${data.toString().trim()}`);
  });

  process.on('close', (code) => {
    console.log(`[${proxy.name}:${proxy.port}] 🔴 Proxy cerrado (código: ${code})`);
  });

  console.log(`✅ Proxy ${proxy.name} iniciado en puerto ${proxy.port}\n`);
  
  return process;
}

console.log('📋 Proxies que se van a iniciar:');
proxies.forEach(proxy => {
  console.log(`   • ${proxy.name}: localhost:${proxy.port} → ${proxy.url}`);
});

console.log('\n🔧 Configuración en la app:');
console.log('   • Anthropic: http://localhost:8010');
console.log('   • OpenAI: http://localhost:8011'); 
console.log('   • Gemini: http://localhost:8012');

console.log('\n⚠️  IMPORTANTE:');
console.log('   • Estos proxies son SOLO para desarrollo');
console.log('   • NO usar en producción');
console.log('   • Para apps móviles usar URLs originales');

console.log('\n⏳ Iniciando proxies...\n');

// Iniciar todos los proxies
const processes = proxies.map(startProxy);

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando todos los proxies...');
  processes.forEach(proc => {
    proc.kill('SIGINT');
  });
  process.exit(0);
});

console.log('🎉 Todos los proxies están ejecutándose!');
console.log('💡 Presiona Ctrl+C para cerrar todos los proxies');
console.log('🌐 Ahora puedes usar las APIs externas en tu app web\n');
// Script para debugear URLs de proveedores
const fs = require('fs');

console.log('🔍 Debug de Proveedores\n');

// Verificar si existe el archivo de configuración
const settingsPath = './src/contexts/SettingsContext.tsx';
const providerServicePath = './src/services/providerService.ts';

if (fs.existsSync(settingsPath)) {
  console.log('✅ SettingsContext.tsx encontrado');
} else {
  console.log('❌ SettingsContext.tsx no encontrado');
}

if (fs.existsSync(providerServicePath)) {
  console.log('✅ providerService.ts encontrado');
  
  // Leer el archivo y buscar la función getApiUrl
  const content = fs.readFileSync(providerServicePath, 'utf8');
  const hasGetApiUrl = content.includes('getApiUrl');
  
  if (hasGetApiUrl) {
    console.log('✅ Función getApiUrl encontrada');
    
    // Verificar cuántas veces aparece
    const matches = content.match(/getApiUrl/g);
    console.log(`📊 getApiUrl aparece ${matches ? matches.length : 0} veces`);
    
    // Buscar la implementación de Anthropic
    const anthropicMatch = content.match(/class AnthropicProviderService[\s\S]*?private getApiUrl\([\s\S]*?\{[\s\S]*?\}/);
    if (anthropicMatch) {
      console.log('✅ Implementación de AnthropicProviderService.getApiUrl encontrada');
    } else {
      console.log('❌ Implementación de AnthropicProviderService.getApiUrl NO encontrada');
    }
  } else {
    console.log('❌ Función getApiUrl NO encontrada');
  }
} else {
  console.log('❌ providerService.ts no encontrado');
}

console.log('\n📋 Pasos de solución:');
console.log('1. Reinicia la app web completamente');
console.log('2. Ve a Settings → Anthropic');
console.log('3. Verifica que la URL sea: http://localhost:8010');
console.log('4. Si no es así, cámbiala manualmente');
console.log('5. Guarda la configuración');
console.log('6. Prueba la conexión');

console.log('\n🚀 URLs correctas para proxies CORS:');
console.log('   • Anthropic: http://localhost:8010');
console.log('   • OpenAI: http://localhost:8011');
console.log('   • Gemini: http://localhost:8012');

console.log('\n⚠️  Si el problema persiste:');
console.log('   • Borra los datos de la app en el navegador');
console.log('   • Usa el modo incógnito');
console.log('   • Verifica que npm run cors-proxy esté ejecutándose');
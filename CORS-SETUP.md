# 🌐 Configuración CORS para APIs Externas

Este documento explica cómo configurar y usar APIs externas (Anthropic, OpenAI, Gemini) en la versión web de la aplicación.

## 🚨 Problema CORS

Las APIs de terceros **NO permiten** llamadas directas desde navegadores web por razones de seguridad (CORS Policy). Esto es **normal y esperado**.

### ✅ Lo que funciona:
- **Ollama**: ✅ Funciona directamente (localhost)
- **APIs en móvil**: ✅ iOS/Android no tienen restricciones CORS
- **APIs en web**: ❌ Bloqueadas por CORS

## 🛠️ Soluciones

### **Opción 1: Proxy CORS Automático (Recomendado)**

Ejecuta el script automático que configura todos los proxies:

```bash
npm run cors-proxy
```

Esto iniciará proxies en:
- **Anthropic**: `http://localhost:8010` → `https://api.anthropic.com/v1`
- **OpenAI**: `http://localhost:8011` → `https://api.openai.com/v1`
- **Gemini**: `http://localhost:8012` → `https://generativelanguage.googleapis.com/v1beta`

### **Opción 2: Proxies Individuales**

Para iniciar proxies individuales:

```bash
# Solo Anthropic
npm run cors-anthropic

# Solo OpenAI  
npm run cors-openai

# Solo Gemini
npm run cors-gemini
```

### **Opción 3: Manual**

Si prefieres configurar manualmente:

```bash
# Anthropic
npx local-cors-proxy --proxyUrl https://api.anthropic.com/v1 --port 8010 --credentials

# OpenAI
npx local-cors-proxy --proxyUrl https://api.openai.com/v1 --port 8011 --credentials

# Gemini  
npx local-cors-proxy --proxyUrl https://generativelanguage.googleapis.com/v1beta --port 8012 --credentials
```

## 📱 Configuración en la App

### **Para Web (con proxy CORS):**
1. Ejecuta `npm run cors-proxy` en una terminal
2. En la app, configura las URLs como:
   - Anthropic: `http://localhost:8010`
   - OpenAI: `http://localhost:8011`
   - Gemini: `http://localhost:8012`

### **Para Móvil (URLs directas):**
- Anthropic: `https://api.anthropic.com`
- OpenAI: `https://api.openai.com`
- Gemini: `https://generativelanguage.googleapis.com`

## 🔐 API Keys

Necesitarás API Keys válidas para cada servicio:

### **Anthropic (Claude)**
1. Ve a: https://console.anthropic.com/
2. Crea una cuenta y obtén tu API Key
3. Formatos soportados: `claude-3-haiku-20240307`, `claude-3-sonnet-20240229`, etc.
4. **Nota**: Anthropic requiere el header `anthropic-dangerous-direct-browser-access` para CORS (ya incluido automáticamente)

### **OpenAI (GPT)**
1. Ve a: https://platform.openai.com/api-keys
2. Crea una API Key
3. Formatos soportados: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`

### **Google Gemini**
1. Ve a: https://ai.google.dev/
2. Obtén una API Key de Google AI Studio
3. Formatos soportados: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`

## 🚀 Flujo de Trabajo Recomendado

### **Desarrollo Web:**
```bash
# Terminal 1: Iniciar proxies CORS
npm run cors-proxy

# Terminal 2: Iniciar la app web
npm run web
```

### **Desarrollo Móvil:**
```bash
# No necesitas proxies CORS
npm start
# o
npm run android
npm run ios
```

## ⚠️ Limitaciones y Consideraciones

### **Desarrollo vs Producción**
- **Proxies CORS**: Solo para desarrollo local
- **Producción web**: Necesitarás un backend que maneje las APIs
- **Apps móviles**: Sin limitaciones CORS

### **Rendimiento**
- Los proxies añaden latencia mínima
- Cada proxy usa un puerto diferente
- Consumen recursos adicionales

### **Seguridad**
- **NUNCA** uses proxies CORS en producción
- Las API Keys se envían a través del proxy
- Solo para desarrollo en localhost

## 🔧 Solución de Problemas

### **Error: "Network Error" o "CORS blocked"**
1. Verifica que el proxy esté ejecutándose
2. Comprueba que uses la URL del proxy (`localhost:8010`)
3. Asegúrate de que tengas una API Key válida

### **Error: "EADDRINUSE" (Puerto ocupado)**
1. Cierra otros procesos en esos puertos
2. O cambia los puertos en `cors-setup.js`

### **API Key inválida**
1. Verifica que la API Key sea correcta
2. Comprueba que tengas créditos/cuota disponible
3. Asegúrate de usar el formato de modelo correcto

## 📚 Recursos Adicionales

- [Documentación Anthropic](https://docs.anthropic.com/)
- [Documentación OpenAI](https://platform.openai.com/docs)
- [Documentación Gemini](https://ai.google.dev/docs)
- [Info sobre CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## 🆘 Soporte

Si tienes problemas:
1. Revisa la consola del navegador para errores
2. Verifica que los proxies estén ejecutándose
3. Comprueba que las API Keys sean válidas
4. Asegúrate de usar las URLs correctas según la plataforma
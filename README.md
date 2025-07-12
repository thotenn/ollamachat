# Ollama Chat App

Una aplicación móvil de React Native Expo para chatear con modelos de Ollama en tu servidor local.

## Características

- 💬 Interfaz de chat intuitiva
- 🔧 Configuración flexible del servidor Ollama
- 🤖 Soporte para múltiples modelos
- 💾 Persistencia de configuración
- 🔄 Respuestas en streaming en tiempo real
- 📱 Diseño responsivo para iOS y Android

## Requisitos previos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI
- Servidor Ollama ejecutándose (local o remoto)

## Instalación

1. Clona o descarga este proyecto
2. Navega al directorio del proyecto:
   ```bash
   cd ollamachat
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```

## Configuración de Ollama

Asegúrate de que tu servidor Ollama esté configurado para aceptar conexiones desde tu dispositivo móvil:

1. Si estás usando Ollama localmente, configúralo para escuchar en todas las interfaces:
   ```bash
   OLLAMA_HOST=0.0.0.0:11434 ollama serve
   ```

2. Si estás en un dispositivo físico, usa la IP de tu computadora (ej: `http://192.168.1.100:11434`)

## Ejecutar la aplicación

### En Expo Go (recomendado para desarrollo)

```bash
npm start
```

Luego escanea el código QR con la app Expo Go en tu dispositivo.

### En iOS Simulator

```bash
npm run ios
```

### En Android Emulator

```bash
npm run android
```

### En Web (desarrollo)

```bash
npm run web
```

## Uso

1. **Configuración inicial**: Ve a la pestaña "Configuración"
2. **Configura el servidor**: Ingresa la URL de tu servidor Ollama
3. **Prueba la conexión**: Presiona "Probar" para verificar la conexión
4. **Selecciona un modelo**: Elige uno de los modelos disponibles
5. **Guarda la configuración**: Presiona "Guardar Configuración"
6. **Comienza a chatear**: Ve a la pestaña "Chat" y empieza a conversar

## Estructura del proyecto

```
ollamachat/
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── contexts/        # Contextos de React
│   ├── screens/         # Pantallas principales
│   ├── services/        # Servicios y APIs
│   ├── types/           # Tipos de TypeScript
│   ├── utils/           # Utilidades
│   └── hooks/           # Custom hooks
├── App.tsx              # Componente principal
├── package.json         # Dependencias
└── tsconfig.json        # Configuración TypeScript
```

## Solución de problemas

### No se puede conectar al servidor Ollama

- Verifica que Ollama esté ejecutándose
- Asegúrate de usar la IP correcta (no localhost si estás en un dispositivo físico)
- Verifica que no haya firewalls bloqueando la conexión
- En macOS/Linux, puedes necesitar configurar OLLAMA_HOST

### Los modelos no aparecen

- Asegúrate de haber descargado al menos un modelo en Ollama:
  ```bash
  ollama pull llama2
  ```

## Personalización

Puedes personalizar los estilos editando los archivos en `src/screens/`. Los colores principales están definidos en los StyleSheets de cada componente.

## Licencia

Este proyecto está bajo la licencia MIT.
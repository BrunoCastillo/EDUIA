# 🎓 EDUIA - Sistema Educativo con Inteligencia Artificial

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue.svg)](https://postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)

##  Descripción

**EDUIA** es un sistema educativo inteligente desarrollado como Trabajo Final de Máster (TFE) que integra tecnologías de Inteligencia Artificial para mejorar la experiencia de aprendizaje. El sistema utiliza técnicas de RAG (Retrieval Augmented Generation) para proporcionar respuestas contextualizadas basadas en material educativo.

###  Características Principales

- Chat Inteligente: Interacción con IA basada en contenido educativo específico
- Gestión de Contenido: Subida y procesamiento de PDFs y sílabos
- Panel de Profesores: Herramientas para gestión de asignaturas y contenido
- Portal de Estudiantes: Acceso a evaluaciones y material de estudio
- Búsqueda Semántica: Utilizando embeddings y pgvector para búsquedas inteligentes
- Sistema de Evaluaciones: Generación automática de preguntas y evaluaciones

##  Tecnologías Utilizadas

### Frontend
- **React.js** - Interfaz de usuario
- **CSS3** - Estilos y diseño responsivo
- **JavaScript ES6+** - Lógica del cliente

### Backend
- **Node.js** - Servidor backend
- **Express.js** - Framework web
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Base de datos principal
- **pgvector** - Extensión para búsqueda vectorial

### Inteligencia Artificial
- **DeepSeek API** - Modelo de lenguaje para generación de respuestas
- **Embeddings** - Procesamiento de texto para búsqueda semántica
- **RAG (Retrieval Augmented Generation)** - Arquitectura de IA contextual

##  Instalación

### Prerrequisitos
- Node.js 18.x o superior
- PostgreSQL 15.x
- Cuenta en Supabase
- API Key de DeepSeek

### 1. Clonar el Repositorio
```bash
git clone --recursive https://github.com/BrunoCastillo/EDUIA.git
cd EDUIA
```

### 2. Instalar Dependencias
```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del submódulo
cd EDUIA
npm install
cd ..
```

### 3. Configuración de Variables de Entorno
Crear un archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=tu_supabase_url
REACT_APP_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_KEY=tu_supabase_service_key

# DeepSeek API
DEEPSEEK_API_KEY=tu_deepseek_api_key

# Database Configuration
DATABASE_URL=tu_database_url

# Server Configuration
PORT=3001
```

### 4. Configuración de Base de Datos
```bash
# Ejecutar migraciones
cd EDUIA/database
psql -d tu_database -f schema.sql
psql -d tu_database -f migrations/001_initial_schema.sql
# ... ejecutar todas las migraciones en orden
```

### 5. Inicializar pgvector
```sql
-- En tu base de datos PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

## 🔧 Uso

### Desarrollo
```bash
# Iniciar el servidor de desarrollo
npm run dev

# Iniciar solo el frontend
npm start

# Iniciar solo el backend
npm run server
```

### Producción
```bash
# Construir para producción
npm run build

# Iniciar servidor de producción
npm run start:prod
```

## 📁 Estructura del Proyecto

```
EDUIA-TFE/
├── EDUIA/                          # Submódulo principal
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Componentes de autenticación
│   │   │   ├── professor/         # Panel de profesores
│   │   │   ├── student/           # Portal de estudiantes
│   │   │   └── common/            # Componentes compartidos
│   │   ├── services/              # Servicios de API
│   │   │   ├── auth.service.js
│   │   │   ├── deepseek.service.js
│   │   │   ├── rag.service.js
│   │   │   └── syllabus.service.js
│   │   ├── contexts/              # Contextos de React
│   │   └── utils/                 # Utilidades
│   ├── database/
│   │   ├── migrations/            # Migraciones de BD
│   │   ├── functions.sql          # Funciones personalizadas
│   │   └── schema.sql             # Esquema de base de datos
│   ├── public/                    # Archivos públicos
│   └── uploads/                   # Archivos subidos
├── .gitignore
├── package.json
└── README.md
```

## Funcionalidades Principales

### Para Profesores
- ✅ Gestión de asignaturas
- ✅ Subida de sílabos y material educativo
- ✅ Configuración de temas y subtemas
- ✅ Generación automática de evaluaciones
- ✅ Chat inteligente contextualizado

### Para Estudiantes
- ✅ Acceso a material de estudio
- ✅ Realización de evaluaciones
- ✅ Chat educativo con IA
- ✅ Seguimiento de progreso

### Sistema de IA
- ✅ Procesamiento de documentos PDF
- ✅ Generación de embeddings
- ✅ Búsqueda semántica en contenido
- ✅ Respuestas contextualizadas
- ✅ Eliminación inteligente de stopwords

## 🗄️ Base de Datos

### Tablas Principales
- `users` - Gestión de usuarios
- `subjects` - Asignaturas
- `syllabus` - Sílabos y material
- `syllabus_topics` - Temas del sílabo
- `syllabus_subtopics` - Subtemas
- `embeddings` - Vectores para búsqueda semántica
- `files` - Gestión de archivos

### Funciones Personalizadas
- `match_fragments()` - Búsqueda de fragmentos similares
- `generate_embeddings()` - Generación de embeddings
- Políticas RLS (Row Level Security)

## Seguridad

- **Autenticación**: Supabase Auth
- **Autorización**: Row Level Security (RLS)
- **Validación**: Sanitización de inputs
- **Encriptación**: HTTPS en producción
- **Gestión de Archivos**: Validación de tipos y tamaños

## Testing

```bash
# Ejecutar tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests de integración
npm run test:integration
```

## 📈 Rendimiento

- **Búsqueda Vectorial**: Optimizada con índices ivfflat
- **Caché**: Implementado para consultas frecuentes
- **Compresión**: Gzip habilitado
- **CDN**: Para archivos estáticos

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Changelog

### v1.0.0 
- ✅ Implementación inicial del sistema
- ✅ Integración con DeepSeek API
- ✅ Sistema de RAG funcional
- ✅ Gestión de usuarios y roles
- ✅ Subida y procesamiento de PDFs
- ✅ Chat inteligente contextualizado

## Issues Conocidos

- Limitación de tamaño de archivos PDF (100MB)
- Tiempo de procesamiento para documentos grandes
- Compatibilidad limitada con algunos formatos PDF

##  Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Estadísticas del Proyecto

- **Lenguajes**: JavaScript (75.4%), CSS (23.0%), PLpgSQL (1.3%), HTML (0.3%)
- **Commits**: 50+ commits
- **Archivos**: 100+ archivos
- **Dependencias**: 50+ paquetes npm

---

*Desarrollado como Trabajo Final de Máster - 2025* 

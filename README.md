# Mindful Flow

Mindful Flow es una plataforma integral de gestión diseñada para profesionales de la salud mental y bienestar. Esta aplicación moderna y responsiva facilita la administración de pacientes, citas, finanzas y notas, todo potenciado por un asistente de inteligencia artificial.

## 🚀 Características Principales

*   **Panel de Control (Dashboard)**: Una vista general intuitiva con métricas clave y accesos directos.
*   **Gestión de Pacientes**: Administración eficiente de perfiles y registros de pacientes.
*   **Calendario Inteligente**: Programación y seguimiento de citas y sesiones.
*   **Asistente IA**: Herramienta de soporte inteligente para ayudar en la gestión diaria.
*   **Finanzas**: Seguimiento detallado de ingresos y reportes financieros.
*   **Notas**: Sistema de notas para sesiones y recordatorios personales.

## 🛠️ Tecnologías Utilizadas

Este proyecto está construido con un stack tecnológico moderno para asegurar rendimiento y escalabilidad:

*   **Core**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
*   **Componentes UI**: [shadcn/ui](https://ui.shadcn.com/) (basado en Radix UI)
*   **Enrutamiento**: [React Router](https://reactrouter.com/)
*   **Gestión de Estado/Data**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
*   **Gráficos**: [Recharts](https://recharts.org/)
*   **Formularios y Validación**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
*   **Iconos**: [Lucide React](https://lucide.dev/)

## 📦 Instalación y Uso

Sigue estos pasos para ejecutar el proyecto localmente:

### Prerrequisitos

*   Node.js (versión 18 o superior recomendada)
*   npm (incluido con Node.js)

### Pasos

1.  **Clonar el repositorio**
    ```bash
    git clone <TU_URL_DEL_REPOSITORIO>
    cd mindful-flow
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Iniciar el servidor de desarrollo**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:8080` (o el puerto que indique la consola).

4.  **Construir para producción**
    ```bash
    npm run build
    ```

## 📂 Estructura del Proyecto

```
src/
├── components/   # Componentes reutilizables y de UI (shadcn)
├── hooks/        # Hooks personalizados de React
├── lib/          # Utilidades y funciones auxiliares
├── pages/        # Componentes de página (Vistas principales)
│   ├── Dashboard.tsx
│   ├── Patients.tsx
│   ├── Calendar.tsx
│   ├── AIAssistant.tsx
│   ├── Notes.tsx
│   └── Finance.tsx
├── App.tsx       # Configuración principal de rutas
└── main.tsx      # Punto de entrada de la aplicación
```

## 🤝 Contribución

Si deseas contribuir a este proyecto, por favor crea un fork y envía un Pull Request con tus mejoras.

---

Desarrollado con ❤️ para mejorar el flujo de trabajo en salud mental.

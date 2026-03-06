# Contexto del Agente - Mindful Flow

Este archivo documenta el estado actual, el contexto y las normas del proyecto para facilitar la colaboración continua.

## 🧠 Estado del Proyecto

**Nombre del Proyecto**: Mindful Flow
**Descripción**: Plataforma de gestión para profesionales de la salud mental.
**Estado Actual**: En desarrollo activo (Fase de Integración y Corrección).

### 📍 Foco Actual
El equipo (Usuario + Agente) se encuentra trabajando en la **estabilización de las integraciones** y la **corrección de funcionalidades críticas**.

**Tareas Recientes/En Curso:**
*   **Integración con Stripe**: Se han realizado esfuerzos para corregir la sincronización de pagos, webhooks y generación de enlaces de pago.
*   **Autenticación y Datos de Usuario**: Debugging de problemas de login, visualización de datos de usuario en la sidebar y persistencia de sesión.
*   **Correcciones de UI**: Ajustes en el dashboard, orden de elementos (usuario/logout) y estilos visuales.

## 🛠️ Stack Tecnológico

*   **Frontend**: React, Vite, TypeScript.
*   **Estilos**: Tailwind CSS, shadcn/ui.
*   **Backend/BaaS**: Supabase (Auth, Database, Edge Functions).
*   **Pagos**: Stripe.
*   **Estado/Data**: React Query.

## 📂 Arquitectura y Convenciones

*   **Estructura**: `src/pages` para vistas, `src/components` para piezas reutilizables.
*   **Estilos**: Utility-first con Tailwind. Se prefiere la personalización a través de `tailwind.config.ts`.
*   **Componentes**: Uso de componentes de `shadcn/ui` en `src/components/ui`.
*   **Gestión de Estado**: React Query para estado del servidor. Context API para estado global simple (ej. `AuthContext`).

## 📝 Notas para el Agente

1.  **Idioma**: Toda la documentación y comunicación debe ser en **Español** (salvo nombres de variables/código en inglés).
2.  **Seguridad**: Verificar siempre las claves de entorno (Stripe, Supabase) y las políticas RLS en base de datos.
3.  **Supabase**: Al modificar la base de datos, recordar actualizar los tipos de TypeScript si es necesario.
4.  **UX/UI**: Mantener, usar y crear una estética "Premium" y "Mindful" (colores suaves, buenas transiciones) como se ha solicitado previamente.

## 🔄 Flujos de Trabajo Comunes

*   **Deploys**: (Pendiente de definir, posiblemente Vercel o Netlify).
*   **Testing**: Vitest está configurado. Se debe fomentar su uso para lógica crítica.

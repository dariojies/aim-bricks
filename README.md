# Aim-Bricks & Biblioteca Virtual

Una moderna aplicación web diseñada para la reserva y gestión del catálogo local de **Aim Brickslabs** y **Libros**. Está integrada con un sistema de autenticación centralizado y un Panel de Administración para el control seguro del inventario.

## Arquitectura y Tecnologías
*   **Frontend:** React 19, TypeScript, Vite. Diseño de interfaz (UI) ultra estético basado en Glassmorphism.
*   **Backend:** Node.js, Express (API REST en `server.js`).
*   **Base de Datos:** PostgreSQL en la nube (Compartida de forma hermética con otros 5 submódulos).
*   **ORM:** Prisma Client (v6) - Configurado para inspeccionar la DB e interactuar con el esquema.

## Estructura de Base de Datos
La aplicación hace uso de las siguientes tablas en PostgreSQL gestionadas por Prisma:
- **`users`**: Tabla principal de usuarios compartida con otros sistemas. Gestiona el acceso (`email`, `password`) y roles.
- **`bricks_brickslab`**: Almacena el catálogo físico de los sets de LEGO® disponibles, incluyendo su estado de stock y número de referencia.
- **`bricks_librarybook`**: Almacena el catálogo de literatura, con metadatos como el autor y el ISBN.
- **`bricks_reservation`**: Controla las reservas actualmente "Activas". Relaciona a un `userId` con un `brickslabId` o `libraryBookId` bloqueando el stock dinámicamente.
- **`bricks_userhistory`**: Guarda el histórico de elementos completados/devueltos para rellenar el historial del perfil del usuario.
- **`bricks_missing_pieces`**: Tabla dedicada a gestionar reportes de alumnos sobre piezas perdidas en los sets de LEGO.
- **`bricks_poll`**, **`bricks_poll_option`**, **`bricks_poll_vote`**: Sistema de votaciones dinámico, ligado exclusivamente a usuarios con el rango `canReserveBrickslab`.
- **`bricks_ranks`**: Tabla exclusiva de este sistema que administra los permisos individualizados ("Rango Brickslab" y "Rango Biblioteca") sin entrometerse en la tabla global de usuarios.

## Funcionalidades Core
1.  **Catálogo en Vivo y Sincronizado:** Exploración con etiquetas de dificultad y estado. El catálogo ahora hace polling silencioso cada 10s para mantener la disponibilidad de inventario 100% sincrónica para todos los clientes sin necesidad de recargar la página.
2.  **Sistema de Reservas (3 Fases):** Los alumnos inician sesión de forma segura y pueden reservar material. El flujo consta de *Reserva Pendiente de Recogida* -> *Entregado al Alumno* -> *Devuelto*. Permite también la cancelación de reservas activas por parte del usuario antes de recoger el ítem.
3.  **Perfil y Autenticación Mejorada:** Historial persistente en la DB. Además de ver tus reservas, ahora se integra un sistema de Reseteo Seguro: Si un Admin resetea una clave web, el alumno estará forzado a cambiar su clave en un modal ciego temporal en su primer inicio de sesión.
4.  **Sistema de Votaciones y de Incidencias:**
    - Panel de encuestas globales limitadas a usuarios con permisos Brickslab para decidir futuras compras.
    - Botón UI de "Piezas Faltantes" para poder notificar piezas perdidas a la administración tras el préstamo.
5.  **Panel de Administración Integral:** Protegido por una columna dedicada `dev_role` en la tabla global. Permite al instructor:
    - Control avanzado de las reservas con sus tres estados y botón centralizado de recogida/devolución.
    - CRUD completo, gestor de contraseñas, revisión de incidencias (piezas) y lanzamiento de nuevas votaciones.

## Instrucciones para Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de Entorno (`.env`):**
   No olvides añadir el archivo `.env` en tu raíz con la URI productiva de Heroku.
   ```env
   DATABASE_URL="postgres://usuario:password@host:5432/dbname"
   ```

3. **Sincronizar Prisma Client:**
   Al ser una arquitectura en la nube, el ORM necesita compilar tus librerías locales:
   ```bash
   npx prisma generate
   ```

4. **Levantar los Servidores:**
   *Interfaz Visual en Vite:*
   ```bash
   npm run dev
   ```
   *Servidor API Real (Node):*
   ```bash
   node server.js
   ```

## Notas Rápidas de Despliegue (Heroku)
El proyecto ha sido optimizado con un script `heroku-postbuild`. Heroku descargará Prisma, leerá tu schema, compilará Typescript (React Vite) e instanciará el servidor Express de producción automáticamente con un solo comando:
```bash
git push heroku main
```
> **Aviso de Seguridad**: La carpeta `infopriv/` (donde se ubican los dumps enteros estructurales o en bruto de tu base de datos y esquemas delicados) se encuentra excluida permanentemente de las subidas gracias a `.gitignore`.

# Aim-Bricks & Biblioteca Virtual

Una moderna aplicación web diseñada para la reserva y gestión del catálogo local de **Aim Brickslabs** y **Libros**. Está integrada con un sistema de autenticación centralizado y un Panel de Administración para el control seguro del inventario.

## Arquitectura y Tecnologías
*   **Frontend:** React 19, TypeScript, Vite. Diseño de interfaz (UI) ultra estético basado en Glassmorphism.
*   **Backend:** Node.js, Express (API REST en `server.js`).
*   **Base de Datos:** PostgreSQL en la nube (Compartida de forma hermética con otros 5 submódulos).
*   **ORM:** Prisma Client (v6) - Configurado para inspeccionar la DB e inyectar tablas exclusivas (`Brickslab`, `LibraryBook`, `Reservation`, `UserHistory`) sin manipular los datos genéricos.

## Funcionalidades Core
1.  **Catálogo en Vivo:** Exploración de Brickslabs y Libros disponibles con etiquetas de dificultad, estado de disponibilidad y sinopsis.
2.  **Sistema de Reservas Compartido:** Los alumnos inician sesión de forma segura y pueden reservar material al instante.
3.  **Perfil Inteligente:** Historial persistente en la DB con todo el material montado o leído.
4.  **Panel de Administración (Gestión):** Protegido por una columna dedicada `dev_role` en la base de datos de usuarios. Permite al instructor:
    - Control de las reservas activas (con botón para confirmar devolución).
    - CRUD Automático (Dar de alta manuales y legos, o eliminarlos depurando el historial para no romper relaciones).

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

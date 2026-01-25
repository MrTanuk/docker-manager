# DockerManager - Un Gestor de Contenedores con Tauri y Rust

Una aplicación de escritorio para gestionar contenedores Docker, construida con Tauri, Rust, React y TypeScript. Permite crear, inspeccionar y monitorear contenedores, con un enfoque en la configuración de límites de recursos (CGroups) y el aislamiento (Namespaces).

![Captura de la App](URL_DE_LA_IMAGEN_AQUI)
*Pega aquí la URL de la imagen que me enviaste. Súbela a un issue de GitHub y copia el link.*

---

### ✨ Características Principales

- **Listado de Contenedores:** Visualiza todos tus contenedores (activos e inactivos).
- **Acciones Rápidas:** Inicia, detiene, reinicia y elimina contenedores desde la lista.
- **Creación Parametrizada:** Crea nuevos contenedores definiendo:
  - Imagen base.
  - **Límites de CPU y RAM (CGroups).**
  - Sistema de archivos de solo lectura (Read-Only RootFS).
  - Montaje de volúmenes para persistencia de datos y logs (Bind Mount).
- **Inspector Detallado:**
  - **Monitoreo en Tiempo Real:** Gráficas de uso de CPU y RAM.
  - **Stress Testing:** Inyecta carga de CPU y RAM para verificar que los límites de recursos funcionan correctamente.
  - **Explorador de Archivos:** Inspecciona los archivos dentro de los volúmenes montados.
  - **Auditoría de Seguridad Básica.**

### 🛠️ Tecnologías Utilizadas

- **Frontend:** React, TypeScript, Vite, TailwindCSS, Recharts.
- **Backend y Core:** Rust.
- **Framework:** Tauri (para crear la aplicación de escritorio).
- **Interacción con Docker:** Crate `bollard` de Rust.

### 🚀 Cómo Ejecutarlo en Desarrollo

1.  **Clonar el repositorio:**
    ```sh
    git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
    cd TU_REPOSITORIO
    ```
2.  **Instalar dependencias:**
    ```sh
    npm install
    ```
3.  **Ejecutar la aplicación:**
    ```sh
    npm run tauri dev
    ```

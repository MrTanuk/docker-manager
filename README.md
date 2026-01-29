# DockerManager - Gestor de Contenedores Seguro con Tauri v2

<div align="center">
  <img src="https://github.com/user-attachments/assets/f5f06b0b-7534-43f6-8a19-c3c43022940f" alt="Captura de pantalla de DockerManager" width="800"/>
</div>

<p align="center">
  <em>Una aplicación de escritorio moderna para gestionar contenedores Docker, con un enfoque en el control de recursos (CGroups), aislamiento (Namespaces) y seguridad.</em>
</p>

<p align="center">
  <img alt="Rust" src="https://img.shields.io/badge/Language-Rust-%2300599c?style=flat&logo=rust">
  <img alt="React" src="https://img.shields.io/badge/Framework-React-%2361DAFB?style=flat&logo=react">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-orange?style=flat&logo=tauri">
</p>

---

## ✨ Características Principales

### 🚀 Gestión y Despliegue
- **Creación Parametrizada:** Interfaz sencilla para configurar:
  - **Límites de Hardware:** Define cuánta CPU y RAM (MB) puede usar el contenedor.
  - **Seguridad (Read-Only FS):** Bloquea la escritura en el sistema de archivos del contenedor para evitar persistencia de malware.
  - **Red (Networking):** Decide si exponer puertos al host o mantener el contenedor aislado en su propia red.
  - **Variables de Entorno:** Inyecta secretos y configuraciones (`KEY=VALUE`) fácilmente.

### 🔍 Inspector Profundo
- **Monitor en Tiempo Real:** Gráficas de CPU y RAM que respetan visualmente los límites configurados (CGroups).
- **Verificación de Aislamiento:** Visualiza los Namespaces (PID, UTS, Network) para confirmar que el contenedor es invisible para otros procesos.
- **Explorador de Archivos:** Navega por los logs o archivos generados en los volúmenes montados sin entrar a la terminal.
- **Terminal Web:** Acceso directo a una shell (`/bin/bash`) dentro del contenedor usando `ttyd`.

### 🛡️ Pruebas de Estrés y Seguridad
- **Stress Testing:** Inyecta carga sintética de CPU y Memoria para verificar que el Kernel mata o limita el proceso correctamente.
- **Auditoría de FS:** Verifica si el sistema de archivos es realmente de solo lectura.

---

## 📖 Guía de Uso

### 1. Crear un Nuevo Contenedor
En la barra lateral izquierda encontrarás el panel de creación:
1.  **Imagen Base:** Selecciona una imagen de Docker disponible en tu sistema local.
2.  **Nombre:** Asigna un identificador único.
3.  **Variables:** Añade claves/valores (ej. `DB_PASSWORD=secret`).
4.  **Recursos:** Desliza los controles para limitar CPU (0.1 a 1 core) y RAM.
5.  **Configuración Avanzada:**
    - **FS Read-Only:** Actívalo para máxima seguridad (el contenedor no podrá guardar cambios).
    - **Exponer Red:** Actívalo para mapear un puerto. Si lo desactivas, el contenedor estará aislado de la red externa.
6.  Haz clic en **Desplegar**.

### 2. Gestión de Ciclo de Vida
En la lista "Deployments":
- **Estado:** El punto verde/rojo indica si está `Running` o `Exited`.
- **Acciones Rápidas:** Al pasar el mouse, verás botones para:
  - ▶️ Iniciar
  - ⏹️ Detener
  - 🔄 Reiniciar
  - 🗑️ Eliminar (Forzado)

### 3. Inspector (Panel Derecho)
Al seleccionar un contenedor, se abre el inspector con varias pestañas:
- **Overview:** Resumen de IPs, puertos y estado de seguridad.
- **Config:** Permite editar variables de entorno. **Nota:** Al guardar, el contenedor se recreará.
- **Cgroups:** Gráficas de rendimiento. Usa el botón "Inyectar Carga" para probar los límites.
- **Namespaces:** Compara los PIDs del Host vs Contenedor para visualizar el aislamiento.
- **Storage:** Lista los archivos en la ruta de logs montada.

---

## 🛠️ Tecnologías Utilizadas

-   **Frontend:** React 19, TypeScript, TailwindCSS v4, Recharts.
-   **Backend:** Rust, Tauri v2.
-   **Docker Engine:** Comunicación directa vía `bollard` (Rust Docker Client).
-   **Herramientas:** `stress-ng` (para pruebas de carga), `ttyd` (para la terminal web).

---

## 📋 Prerrequisitos

#### 1. Docker
El demonio de Docker debe estar corriendo.

#### 2. ttyd (Para la terminal web)
La aplicación usa `ttyd` para exponer la terminal del contenedor vía WebSocket.
- **Ubuntu/Debian:** `sudo apt install ttyd`
- **Arch:** `sudo pacman -S ttyd`
- **Mac:** `brew install ttyd`

#### 3. Dependencias de Desarrollo (Solo para compilar)
<details>
<summary><strong>Ver librerías necesarias (Linux)</strong></summary>

```sh
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```
</details>

---

## 🚀 Ejecución y Compilación

1.  **Instalar dependencias JS:**
    ```sh
    npm install
    ```

2.  **Modo Desarrollo:**
    ```sh
    npm run tauri dev
    ```

3.  **Compilar para Producción:**
    ```sh
    npm run tauri build
    ```
    El binario final estará en `src-tauri/target/release/bundle/`.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

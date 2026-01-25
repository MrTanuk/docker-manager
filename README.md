# DockerManager - Un Gestor de Contenedores con Tauri y Rust

<div align="center">
  <img src="https://raw.githubusercontent.com/MrTanuk/docker-manager/main/screenshot.png" alt="Captura de pantalla de DockerManager" width="800"/>
</div>
<p align="center">
  <em>Una aplicación de escritorio moderna para gestionar contenedores Docker, con un enfoque en el control de recursos (CGroups) y el aislamiento (Namespaces).</em>
</p>
<p align="center">
  <img alt="GitHub language count" src="https://img.shields.io/github/languages/count/MrTanuk/docker-manager?color=%23f34b7d">
  <img alt="License" src="https://img.shields.io/github/license/MrTanuk/docker-manager?color=%234c1">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/MrTanuk/docker-manager?color=%235c6bc0">
</p>

---

## ✨ Características Principales

-   **Gestión Visual:** Lista y visualiza todos tus contenedores (activos e inactivos) con acciones rápidas para iniciar, detener, reiniciar y eliminar.
-   **Creación Parametrizada:** Crea nuevos contenedores definiendo:
    -   Imagen base de Docker.
    -   **Límites de CPU y RAM** para controlar el consumo de recursos (CGroups).
    -   Sistema de archivos de **solo lectura** para mayor seguridad.
    -   **Montaje de volúmenes** (`bind mount`) para vincular carpetas locales con el contenedor.
-   **Inspector Detallado:**
    -   **Monitoreo en Tiempo Real:** Gráficas que muestran el uso de CPU y RAM, respetando visualmente los límites configurados.
    -   **Stress Testing:** Inyecta carga de CPU y RAM para verificar empíricamente que los límites de recursos funcionan.
    -   **Explorador de Archivos:** Inspecciona los archivos dentro de los volúmenes montados en el contenedor.

## 🛠️ Tecnologías Utilizadas

-   **Framework:** Tauri (Rust + Node.js)
-   **Backend:** Rust
-   **Frontend:** React, TypeScript, Vite
-   **Estilos:** TailwindCSS
-   **Gráficas:** Recharts
-   **Interacción con Docker:** Crate de Rust `bollard`

## 📋 Prerrequisitos

Antes de empezar, necesitas tener instalado lo siguiente en tu sistema.

#### 1. Docker
Asegúrate de que el demonio de Docker esté instalado y en ejecución.

- [Instrucciones de instalación de Docker](https://docs.docker.com/engine/install/)

#### 2. Dependencias del Sistema para Tauri
Tauri requiere ciertas librerías de desarrollo para compilar.

<details>
<summary><strong>🔵 Ubuntu / Debian</strong></summary>

```sh
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```
</details>

<details>
<summary><strong>🔴 Fedora</strong></summary>

```sh
sudo dnf check-update
sudo dnf install webkit2gtk4.0-devel \
    curl \
    wget \
    openssl-devel \
    gtk3-devel \
    libayatana-appindicator-devel \
    librsvg2-devel
sudo dnf groupinstall "C Development Tools and Libraries"
```
</details>

<details>
<summary><strong>Arch Linux</strong></summary>

```sh
sudo pacman -Syu
sudo pacman -S webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```
</details>

#### 3. Node.js y Rust
-   **Node.js** (se recomienda usar `nvm` para gestionarlo):
    ```sh
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    nvm install --lts
    ```
-   **Rust:**
    ```sh
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```

## 🚀 Cómo Ejecutar en Desarrollo

1.  **Clona el repositorio:**
    ```sh
    git clone https://github.com/MrTanuk/docker-manager.git
    cd docker-manager
    ```

2.  **Instala las dependencias de Node.js:**
    ```sh
    npm install
    ```

3.  **Ejecuta la aplicación en modo de desarrollo:**
    La primera vez, tardará un poco mientras descarga y compila las dependencias de Rust.
    ```sh
    npm run tauri dev
    ```

## 📦 Compilar el Binario Final

Para generar el ejecutable instalable para tu sistema operativo, ejecuta el siguiente comando:

```sh
npm run tauri build
```

Una vez finalizado, encontrarás el binario (`.AppImage`, `.deb`, etc.) en la carpeta:
`src-tauri/target/release/bundle/`

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

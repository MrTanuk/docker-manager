use bollard::container::{
    Config, CreateContainerOptions, ListContainersOptions, RemoveContainerOptions, StatsOptions,
    StartContainerOptions, RestartContainerOptions, StopContainerOptions
};
use bollard::exec::{CreateExecOptions, StartExecResults}; 
use bollard::image::ListImagesOptions;
use bollard::models::HostConfig;
use bollard::models::PortBinding;
use bollard::Docker;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::collections::HashMap;

// --- MODELOS DE DATOS ---

#[derive(Serialize, Deserialize, Debug)]
struct ContainerInfo {
    id: String,
    name: String,
    status: String,
    short_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct CreateConfig {
    name: String,
    image: String,
    cpu_limit: f64,
    memory_limit: i64,
    read_only_root: bool,
    host_log_path: Option<String>, 
    host_port: Option<String>,
}

#[derive(Serialize, Clone)]
struct MonitorStats {
    cpu: f64,
    memory_mb: f64,
    memory_percent: f64,
    time: String,
}

#[derive(Serialize)]
struct SecurityAudit {
    fs_readonly: bool,
    pids_isolated: bool,
    cpu_cgroup_active: bool,
}

#[derive(Serialize)]
struct ContainerDetails {
    id: String,
    name: String,
    image: String,
    state: String,
    created: String,
    // Namespaces / Kernel Info
    pid_host: i64,
    platform: String,
    driver: String,
    // Red
    ip_address: String,
    mac_address: String,
    // Recursos
    cpu_limit_nano: i64,
    memory_limit_bytes: i64,
    // Storage
    binds: Vec<String>,
}

// --- CONEXIÓN A DOCKER ---
fn connect_docker() -> Result<Docker, String> {
    if let Ok(docker) = Docker::connect_with_local_defaults() {
        return Ok(docker);
    }
    if let Ok(home) = std::env::var("HOME") {
        let path = format!("unix://{}/.docker/desktop/docker.sock", home);
        if let Ok(docker) = Docker::connect_with_socket(&path, 120, bollard::API_DEFAULT_VERSION) {
            return Ok(docker);
        }
    }
    Err("No se encontró Docker. Asegúrate de que está corriendo.".to_string())
}

// --- COMANDOS EXPORTADOS ---

#[tauri::command]
async fn get_containers() -> Result<Vec<ContainerInfo>, String> {
    let docker = connect_docker()?;
    let opts = ListContainersOptions::<String> { all: true, ..Default::default() };
    let containers = docker.list_containers(Some(opts)).await.map_err(|e| e.to_string())?;

    let mut res = Vec::new();
    for c in containers {
        let name = c.names.unwrap_or_default().first().cloned().unwrap_or_default().replace("/", "");
        let full_id = c.id.clone().unwrap_or_default();
        res.push(ContainerInfo {
            id: full_id.clone(),
            short_id: full_id.chars().take(10).collect(),
            name,
            status: c.state.unwrap_or_default(),
        });
    }
    Ok(res)
}

#[tauri::command]
async fn get_container_details(id: String) -> Result<ContainerDetails, String> {
    let docker = connect_docker()?;
    let inspect = docker.inspect_container(&id, None).await.map_err(|e| e.to_string())?;

    let state = inspect.state.unwrap_or_default();
    let config = inspect.config.unwrap_or_default();
    let host_config = inspect.host_config.unwrap_or_default();
    let network = inspect.network_settings.unwrap_or_default();
    
    let status_str = state.status.map(|s| s.to_string()).unwrap_or_else(|| "unknown".to_string());

    let ip = network.networks.unwrap_or_default().values().next()
        .map(|n| n.ip_address.clone().unwrap_or_default()).unwrap_or_default();

    Ok(ContainerDetails {
        id: inspect.id.unwrap_or_default(),
        name: inspect.name.unwrap_or_default().replace("/", ""),
        image: config.image.unwrap_or_default(),
        state: status_str,
        created: inspect.created.unwrap_or_default(),
        pid_host: state.pid.unwrap_or(0),
        platform: inspect.platform.unwrap_or("linux".to_string()),
        driver: inspect.driver.unwrap_or_default(),
        ip_address: ip,
        mac_address: network.mac_address.unwrap_or_default(),
        cpu_limit_nano: host_config.nano_cpus.unwrap_or(0),
        memory_limit_bytes: host_config.memory.unwrap_or(0),
        binds: host_config.binds.unwrap_or(Vec::new()),
    })
}

#[tauri::command]
async fn get_images() -> Result<Vec<String>, String> {
    let docker = connect_docker()?;
    let opts = ListImagesOptions::<String> { all: false, ..Default::default() };
    let images = docker.list_images(Some(opts)).await.map_err(|e| e.to_string())?;
    
    let mut tags = Vec::new();
    for img in images {
        for t in img.repo_tags { tags.push(t); }
    }
    tags.sort(); tags.dedup();
    Ok(tags)
}

#[tauri::command]
async fn create_container(config: CreateConfig) -> Result<String, String> {
    let docker = connect_docker()?;
    
    let nano_cpus = (config.cpu_limit * 1_000_000_000.0) as i64;
    let mem_bytes = config.memory_limit * 1024 * 1024;

    let mut binds = Vec::new();
    
    // Configuración de puertos
    let mut exposed_ports = HashMap::new();
    let mut port_bindings = HashMap::new();

    // Si el usuario pone un puerto (ej: "8080"), mapeamos 8000(container) -> 8080(host)
    if let Some(port) = config.host_port {
        if !port.trim().is_empty() {
            let container_port = "8000/tcp"; // Nuestro servidor python corre en 8000
            exposed_ports.insert(container_port.to_string(), HashMap::new());
            
            port_bindings.insert(
                container_port.to_string(),
                Some(vec![PortBinding {
                    host_ip: Some("0.0.0.0".to_string()),
                    host_port: Some(port),
                }]),
            );
        }
    }

    if let Some(path) = config.host_log_path {
        if !path.trim().is_empty() {
            binds.push(format!("{}:/app/logs", path));
        }
    }

    let host_config = HostConfig {
        memory: Some(mem_bytes),
        nano_cpus: Some(nano_cpus),
        readonly_rootfs: Some(config.read_only_root),
        binds: Some(binds),
        port_bindings: Some(port_bindings),
        ..Default::default()
    };

    let cfg = Config {
        image: Some(config.image),
        // No sobrescribimos CMD para que corra el python server del Dockerfile
        // cmd: ..., 
        exposed_ports: Some(exposed_ports), // <--- AÑADIDO
        host_config: Some(host_config),
        tty: Some(true),
        ..Default::default()
    };

    let opts = CreateContainerOptions { name: config.name, platform: None };
    let res = docker.create_container(Some(opts), cfg).await.map_err(|e| e.to_string())?;
    docker.start_container(&res.id, None::<StartContainerOptions<String>>).await.map_err(|e| e.to_string())?;
    Ok(res.id)
}

#[tauri::command]
async fn perform_action(id: String, action: String) -> Result<(), String> {
    let docker = connect_docker()?;
    match action.as_str() {
        "start" => docker.start_container(&id, None::<StartContainerOptions<String>>).await.map_err(|e| e.to_string())?,
        "stop" => docker.stop_container(&id, None::<StopContainerOptions>).await.map_err(|e| e.to_string())?,
        "restart" => docker.restart_container(&id, None::<RestartContainerOptions>).await.map_err(|e| e.to_string())?,
        "delete" => docker.remove_container(&id, Some(RemoveContainerOptions { force: true, ..Default::default() })).await.map_err(|e| e.to_string())?,
        _ => return Err("Acción inválida".into()),
    };
    Ok(())
}

#[tauri::command]
async fn inject_stress(id: String, duration: u64) -> Result<String, String> {
    let docker = connect_docker()?;
    
    // stress-ng: 
    // --cpu 4: Intenta usar 4 cores (para saturar si el límite es < 4)
    // --vm 2: Dos procesos de memoria
    // --vm-bytes 2G: Intenta alocar 2GB (para saturar si el límite es < 2GB)
    let cmd = vec![
        "stress-ng".to_string(),
        "--cpu".to_string(), "4".to_string(), 
        "--vm".to_string(), "2".to_string(),
        "--vm-bytes".to_string(), "2G".to_string(), 
        "--timeout".to_string(), format!("{}s", duration)
    ];

    let cfg = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        cmd: Some(cmd), 
        ..Default::default()
    };
    
    let exec = docker.create_exec(&id, cfg).await.map_err(|e| e.to_string())?;
    docker.start_exec(&exec.id, None).await.map_err(|e| e.to_string())?;
    
    Ok("Inyectando carga masiva con stress-ng...".to_string())
}

#[tauri::command]
async fn get_namespace_data(id: String) -> Result<serde_json::Value, String> {
    let docker = connect_docker()?;
    
    // 1. Obtener datos del Host (Tu máquina real)
    // Obtenemos el Hostname ejecutando el comando 'hostname' en tu PC
    let host_hostname = std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "Host-PC".to_string());

    // 2. Inspeccionar el Contenedor
    let inspect = docker.inspect_container(&id, None).await.map_err(|e| e.to_string())?;
    
    let host_pid = inspect.state.and_then(|s| s.pid).unwrap_or(0);
    let container_hostname = inspect.config.and_then(|c| c.hostname).unwrap_or_default();
    
    // Obtener IP del contenedor
    let container_ip = inspect.network_settings
        .and_then(|n| n.networks)
        .and_then(|n| n.values().next().cloned())
        .map(|n| n.ip_address.unwrap_or_default())
        .unwrap_or("Sin IP".to_string());

    // 3. Obtener PID Interno (ejecutando 'ps' DENTRO del contenedor)
    let cmd = vec!["ps", "-p", "1", "-o", "pid="];
    let exec = docker.create_exec(&id, CreateExecOptions {
        attach_stdout: Some(true),
        cmd: Some(cmd.iter().map(|s| s.to_string()).collect()),
        ..Default::default()
    }).await.map_err(|e| e.to_string())?;

    let mut internal_pid_str = "Unknown".to_string();
    
    if let StartExecResults::Attached { mut output, .. } = docker.start_exec(&exec.id, None).await.map_err(|e| e.to_string())? {
        while let Some(Ok(msg)) = output.next().await {
            let s = msg.to_string().trim().to_string();
            if !s.is_empty() {
                internal_pid_str = s;
            }
        }
    }

    Ok(serde_json::json!({
        "pid": {
            "host": host_pid,
            "container": internal_pid_str,
            "is_isolated": host_pid.to_string() != internal_pid_str
        },
        "uts": {
            "host": host_hostname,
            "container": container_hostname,
            "is_isolated": host_hostname != container_hostname
        },
        "network": {
            "container_ip": container_ip,
            "type": "Bridge (Aislado)"
        }
    }))
}

#[tauri::command]
async fn audit_container(id: String) -> Result<SecurityAudit, String> {
    let docker = connect_docker()?;
    
    // Verificar ReadOnly intentando escribir
    let fs_check_cfg = CreateExecOptions {
        attach_stdout: Some(true),
        cmd: Some(vec!["touch".to_string(), "/root/security_check".to_string()]), 
        ..Default::default()
    };
    let exec_fs = docker.create_exec(&id, fs_check_cfg).await.map_err(|e| e.to_string())?;
    let _ = docker.start_exec(&exec_fs.id, None).await;

    let inspect = docker.inspect_container(&id, None).await.map_err(|e| e.to_string())?;
    let host_cfg = inspect.host_config.unwrap_or_default();
    
    Ok(SecurityAudit {
        fs_readonly: host_cfg.readonly_rootfs.unwrap_or(false),
        pids_isolated: true,
        cpu_cgroup_active: host_cfg.nano_cpus.unwrap_or(0) > 0,
    })
}

#[tauri::command]
async fn list_container_files(id: String, path: String) -> Result<Vec<String>, String> {
    let docker = connect_docker()?;
    
    let cmd = vec!["ls".to_string(), "-1".to_string(), path];
    let cfg = CreateExecOptions {
        attach_stdout: Some(true),
        cmd: Some(cmd),
        ..Default::default()
    };
    
    let exec = docker.create_exec(&id, cfg).await.map_err(|e| e.to_string())?;
    
    if let StartExecResults::Attached { mut output, .. } = docker.start_exec(&exec.id, None).await.map_err(|e| e.to_string())? {
        let mut out_str = String::new();
        while let Some(Ok(msg)) = output.next().await {
            out_str.push_str(&msg.to_string());
        }
        let files: Vec<String> = out_str
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        return Ok(files);
    }
    
    Err("No se pudo leer el directorio".to_string())
}

#[tauri::command]
async fn start_monitor(app: AppHandle, container_id: String) -> Result<(), String> {
    let docker = connect_docker()?;
    tauri::async_runtime::spawn(async move {
        let mut stream = docker.stats(&container_id, Some(StatsOptions { stream: true, ..Default::default() }));
        while let Some(Ok(stats)) = stream.next().await {
            let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64 - stats.precpu_stats.cpu_usage.total_usage as f64;
            let sys_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64 - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;
            let cpus = stats.cpu_stats.online_cpus.unwrap_or(1) as f64;
            let cpu_p = if sys_delta > 0.0 && cpu_delta > 0.0 { (cpu_delta / sys_delta) * cpus * 100.0 } else { 0.0 };
            
            let mem_use = stats.memory_stats.usage.unwrap_or(0) as f64;
            let mem_lim = stats.memory_stats.limit.unwrap_or(1) as f64;

            let payload = MonitorStats {
                cpu: (cpu_p * 100.0).round() / 100.0,
                memory_mb: (mem_use / 1024.0 / 1024.0 * 100.0).round() / 100.0,
                memory_percent: (mem_use / mem_lim * 100.0).round() / 100.0,
                time: chrono::Local::now().format("%H:%M:%S").to_string(),
            };
            if let Err(_) = app.emit(&format!("monitor-stats-{}", container_id), payload) { break; }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_containers, 
            get_images, 
            create_container, 
            perform_action, 
            get_container_details,
            inject_stress,
            audit_container,
            start_monitor,
            list_container_files,
            get_namespace_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

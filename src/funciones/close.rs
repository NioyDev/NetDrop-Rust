use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

use crate::funciones::ip::sacar_ip;

// Equivale a esta_cerrado de close.py
pub fn esta_cerrado() -> bool {
    let ip = sacar_ip();
    let addr_str = format!("{ip}:5000");

    if let Ok(socket_addr) = addr_str.parse::<SocketAddr>() {
        if TcpStream::connect_timeout(&socket_addr, Duration::from_secs(1)).is_ok() {
            return false;
        }
    }

    // Fallback a 127.0.0.1:5000
    if let Ok(local_addr) = "127.0.0.1:5000".parse::<SocketAddr>() {
        if TcpStream::connect_timeout(&local_addr, Duration::from_secs(1)).is_ok() {
            return false;
        }
    }

    true
}

// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Tauri desktop shell for GOLIATH.
///
/// The UI itself is the Next.js application (App Router + API routes) so the
/// web, desktop and mobile clients share one implementation. The window points
/// at GOLIATH_APP_URL (default http://localhost:3000), which is either the dev
/// server, a self-hosted instance, or the packaged sidecar described in
/// docs/DESKTOP.md.
fn main() {
  let app_url = std::env::var("GOLIATH_APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![resolve_app_url])
    .setup(move |app| {
      let url = app_url.parse().map_err(|error| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, format!("invalid GOLIATH_APP_URL: {error}"))
      })?;

      tauri::WebviewWindowBuilder::new(
        app,
        "goliath",
        tauri::WebviewUrl::External(url),
    )
    .title("GOLIATH")
    .inner_size(1440.0, 900.0)
    .min_inner_size(1024.0, 700.0)
    .background_color(tauri::window::Color(7, 8, 10, 255))
    .resizable(true)
    .build()?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to start GOLIATH");
}

/// Exposes the resolved workspace URL to the bootstrap page.
#[tauri::command]
fn resolve_app_url() -> String {
  std::env::var("GOLIATH_APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}
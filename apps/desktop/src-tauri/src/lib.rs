pub fn run() {
    tauri::Builder::default()
        .build(tauri::generate_context!())
        .expect("failed to build Frithward desktop application")
        .run(|_, _| {});
}

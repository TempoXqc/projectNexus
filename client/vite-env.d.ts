interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportUri {
  readonly VITE_SOCKET_URI_USER: string;
  readonly VITE_SOCKET_URI_PASS: string;
}
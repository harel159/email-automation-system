const isDev = import.meta.env.DEV;
const apiBase = import.meta.env.EMAIL_AUTOMATION_API_BASE_URL;

export const API_BASE_URL = isDev ? '/api' : `${apiBase}/api`;


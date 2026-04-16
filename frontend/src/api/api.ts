import axios from "axios"

const Base_URL = axios.create({
    baseURL:  import.meta.env["VITE_APP_BASE_URL"],
    headers: {
        "Content-Type": "application/json",
    },
})

const App_Api = {
    getAuthUser: () => Base_URL.get("/auth/google/callback"),
}
import { api } from "../client"

export const ProgressApi = {
    async getDashboard(userId: string) {
        if (!userId) {
            throw new Error("User doesn't Found")
        }
        const response = await api.get("progress/dashboard")
        if (response.status !== 200 || !response.data || response.data.success !== true) {
            throw new Error('Invalid response from portRequest')
        }
        return response
    },

        async postLevelUp(userId: string) {
        if (!userId) {
            throw new Error("User doesn't Found")
        }
        const response = await api.get("progress/level-up")
        if (response.status !== 200 || !response.data || response.data.success !== true) {
            throw new Error('Invalid response from portRequest')
        }
        return response
    }
}
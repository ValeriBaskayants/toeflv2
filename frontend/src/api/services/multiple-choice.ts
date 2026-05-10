import { api } from "../client"

export const MultipleChoice = {
    getTasksMC : () =>{api.get("multiple-choice")},
}
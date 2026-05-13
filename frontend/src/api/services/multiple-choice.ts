import type { MultipleChoice } from "@/types/multipleChoice/MultipleChoice.types";
import { api } from "../client";
import type { Difficulty, Level } from "@/types/globalTypes";

export type GetMCParams = {
  level?: Level;
  difficulty?: Difficulty;
  topic?: string;
  limit?: number;
};

export const MultipleChoiceApi = {
  getTasksMC: (params?: GetMCParams) => { 
    return api.get<MultipleChoice[]>("multiple-choice", { params }); 
  },
}
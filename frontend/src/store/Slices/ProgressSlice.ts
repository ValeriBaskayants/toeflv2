import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

type initialStateType = {
    error:string,
    progress:any,
    loading:boolean
}
const initialState = {
    error:"",
    progress:[],
    loading:false
}
const AsyncProgressSlice = createAsyncThunk(
    "AsyncProgressSlice",
    async () => {
        
    }
)

const ProgressSlice  = createSlice({
    name:"ProgressSlice",
    initialState:initialState,
    reducers:{

    },
    extraReducers:(builder)=>{
        builder.addCase({

        })
    }
})

export default ProgressSlice
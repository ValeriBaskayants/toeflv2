import { configureStore } from '@reduxjs/toolkit'
import { useSelector, type TypedUseSelectorHook } from 'react-redux'
import { useDispatch } from 'react-redux'

export const store = configureStore({
    reducer: {
    }
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

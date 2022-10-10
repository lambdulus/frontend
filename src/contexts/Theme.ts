import { createContext } from "react"

export enum Theme {
  Light,
  Dark,
}

export const ThemeContext = createContext(Theme.Light)

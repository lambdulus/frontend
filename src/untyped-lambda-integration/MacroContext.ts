// import Macro from "./Macro"
import { MacroDef, MacroMap } from "@lambdulus/core"


export interface MContext {
  macros : MacroMap
}

class MacroContext implements MContext {
  public macros : MacroMap = {}
}

const macroContext : MacroContext = new MacroContext()

// export default macroContext
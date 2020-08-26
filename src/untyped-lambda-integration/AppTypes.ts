import { BoxType } from '../Types'
import { EvaluationStrategy, UntypedLambdaState, UntypedLambdaSettings, UntypedLambdaType, StepRecord, UntypedLambdaExpressionState, UntypedLambdaIntegrationState, SettingsEnabled, PromptPlaceholder } from "./Types"
import { ASTReduction, AST, decodeFast as decodeUntypedLambdaFast, Evaluator, NormalEvaluator, None, Expansion, Macro, ASTReductionType, Alpha, Lambda, Beta, Eta, Application, ASTVisitor, Variable, ChurchNumeral, BetaReducer, builtinMacros, MacroTable, Token, tokenize, parse, TokenType, ApplicativeEvaluator, OptimizeEvaluator, NormalAbstractionEvaluator, MacroMap } from '@lambdulus/core'
import { Child, Binary } from '@lambdulus/core/dist/ast'
import { TreeComparator } from './TreeComparator'
import { PositionRecord, BLANK_POSITION } from '@lambdulus/core/dist/lexer/position'
import { reportEvent } from '../misc'

// import macroctx from './MacroContext'

// NOTE: let instead of const just for now
export let UNTYPED_LAMBDA_INTEGRATION_STATE : UntypedLambdaIntegrationState = {
  macrotable : {}
}

export const ADD_BOX_LABEL = '+ Untyped λ Expression'

export const CODE_NAME = 'UNTYPED_LAMBDA_CALCULUS'

export const defaultSettings : UntypedLambdaSettings = {
  type : BoxType.UNTYPED_LAMBDA,
  SLI : false,
  expandStandalones : false,
  strategy : EvaluationStrategy.NORMAL,
  SDE : false,
}

export function createNewUntypedLambdaExpression (defaultSettings : UntypedLambdaSettings) : UntypedLambdaExpressionState {
  return {
    ...defaultSettings,
    __key : Date.now().toString(),
    type : BoxType.UNTYPED_LAMBDA,
    subtype : UntypedLambdaType.EMPTY,
    title : "Untyped λ Expression",
    minimized : false,
    menuOpen : false,
    settingsOpen : false,
    expression : "",
    ast : null,
    history : [],
    isRunning : false,
    breakpoints : [],
    timeoutID : undefined,
    timeout : 5,
    
    // strategy : EvaluationStrategy.NORMAL,
    // singleLetterNames : false,
    // standalones : false,

    macrolistOpen : false,
    macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

    
    editor : {
      placeholder : "placeholder",
      content : "",
      caretPosition : 0,
      syntaxError : null,
    }
  }
}

export function toMacroMap (definitions : Array<string>) : MacroMap {
  return definitions.reduce((acc : MacroMap, def) => {
    const [name, body] = def.split(':=')
    return { ...acc, [name.trim()] : body.trim() }
  }, {})
}

export function createNewUntypedLambdaBoxFromSource (source : string, defaultSettings : UntypedLambdaSettings, subtype : UntypedLambdaType) : UntypedLambdaExpressionState {
  if (subtype === UntypedLambdaType.EMPTY) {
    return {
      ...defaultSettings,
      __key : Date.now().toString(),
      type : BoxType.UNTYPED_LAMBDA,
      subtype,
      title : "Untyped λ Expression",
      minimized : false,
      menuOpen : false,
      settingsOpen : false,
      expression : "",
      ast : null,
      history : [],
      isRunning : false,
      breakpoints : [],
      timeoutID : undefined,
      timeout : 5,
      
      // strategy : EvaluationStrategy.NORMAL,
      // singleLetterNames : false,
      // standalones : false,
  
      macrolistOpen : false,
      macrotable : {  }, // ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable
  
      
      editor : {
        placeholder : "placeholder",
        content : source,
        caretPosition : 0,
        syntaxError : null,
      }
    }
  }
  else {
    return createNewUntypedLambdaBoxFromSource2(source, defaultSettings, subtype)
  }
}

function createNewUntypedLambdaBoxFromSource2 (source : string, defaultSettings : UntypedLambdaSettings, subtype : UntypedLambdaType) : UntypedLambdaExpressionState {
  const { SDE, SLI, strategy } = defaultSettings

  const definitions : Array<string> = source.split(';')
  const expression : string = definitions.pop() || ""
  const macromap : MacroMap = toMacroMap(definitions)
  
  try {
    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars : SLI })
    const ast : AST = parse(tokens, macromap) // macroTable
    
    
    let message = ''
    let isNormal = false

    const astCopy : AST = ast.clone()

    const nextReduction = (() => {
      if (SDE) {
        return findSimplifiedReduction(astCopy, strategy, macromap)[0]
      }
      else {
        const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
        return evaluator.nextReduction
      }
    })()

    
    if (nextReduction instanceof None) {
      isNormal = true
      message = 'Expression is in normal form.'
      
      // reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
    }

    reportEvent('Submit Expression from Link', 'submit valid', source)

    return {
      ...defaultSettings,
      __key : Date.now().toString(),
      type : BoxType.UNTYPED_LAMBDA,
      subtype,
      title : "Untyped λ Expression",
      minimized : false,
      menuOpen : false,
      settingsOpen : false,
      isRunning : false,
      breakpoints : [],
      timeoutID : undefined,
      timeout : 5,
      ast,
      expression : source,
      history : [ {
        ast : ast.clone(),
        lastReduction : new None,
        step : 0,
        message,
        isNormalForm : isNormal
      } ],

      macrolistOpen : false,
      macrotable : macromap,
      // macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

      editor : {
        content : source,
        caretPosition : 0,
        placeholder : PromptPlaceholder.EVAL_MODE,
        syntaxError : null,
      }
    }

  } catch (exception) {
    reportEvent('Submit Expression from Link', 'submit invalid', source)
    throw exception
  }
}

export function resetUntypedLambdaBox (state : UntypedLambdaState) : UntypedLambdaState {
  return {
    ...state,
    subtype : UntypedLambdaType.EMPTY,
    title : "Untyped λ Expression",
    minimized : false,
    expression : "",
    ast : null,
    history : [],
    isRunning : false,
    breakpoints : [],
    timeoutID : undefined,
    timeout : 5,
    
    macrolistOpen : false,
    macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

    
    editor : {
      placeholder : "placeholder",
      content : "",
      caretPosition : 0,
      syntaxError : null,
    }
  }
}

// export function createNewUntypedLambdaExercise (defaultSettings : UntypedLambdaSettings) : UntypedLambdaState {
//   return {
//     ...defaultSettings,
//     __key : Date.now().toString(),
//     type : BoxType.UNTYPED_LAMBDA,
//     subtype : UntypedLambdaType.EXERCISE,
//     title : "Untyped λ Exercise",
//     minimized : false,
//     menuOpen : false,
//     settingsOpen : false,
//     expression : "",
//     ast : null,
//     history : [],
//     isRunning : false,
//     breakpoints : [],
//     timeoutID : undefined,
//     timeout : 5,
    
//     // strategy : EvaluationStrategy.NORMAL,
//     // singleLetterNames : false,
//     // standalones : false,

//     macrolistOpen : false,
//     macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

    
//     editor : {
//       placeholder : "placeholder",
//       content : "",
//       caretPosition : 0,
//       syntaxError : null,
//     }
//   }
// }

// export function createNewUntypedLambdaMacro (defaultSettings : UntypedLambdaSettings) : UntypedLambdaMacroState {
//   return (
//     {
//       ...defaultSettings,
//       __key : Date.now().toString(),
//       type : BoxType.UNTYPED_LAMBDA,
//       title : "Untyped λ Macro Expression",
//       minimized : false,
//       menuOpen : false,
//       settingsOpen : false,
    
//       subtype : UntypedLambdaType.MACRO,
//       expression : '',
//       ast : null,
//       macroName : '',
//       macroExpression : '',

//       macrolistOpen : false,
//       macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

      
//       editor : {
//         placeholder : PromptPlaceholder.MACRO,
//         content : '',
//         caretPosition : 0,
//         syntaxError : null
//       }
//     }
//   )
// }


export function decodeUntypedLambdaState (box : UntypedLambdaState) : UntypedLambdaState {
  return decodeUntypedLambdaExpression(box as UntypedLambdaExpressionState)

  // switch (box.subtype) {
  //   case UntypedLambdaType.ORDINARY:
  //     return decodeUntypedLambdaExpression(box as UntypedLambdaExpressionState)
      
    // case UntypedLambdaType.MACRO:
    //   return box //TODO: implement -- it's not really needed

    // case UntypedLambdaType.EXERCISE:
    //   return decodeUntypedLambdaExpression(box as UntypedLambdaExpressionState)
  // }
}

function decodeUntypedLambdaExpression (box : UntypedLambdaExpressionState) : UntypedLambdaExpressionState {
  const untypedLambdaBox : UntypedLambdaExpressionState = box as UntypedLambdaExpressionState

  if (untypedLambdaBox.expression === '') {
    return untypedLambdaBox
  }
  
  const decodedFirst : AST | null = decodeUntypedLambdaFast(untypedLambdaBox.ast)

  if (decodedFirst === null) {
    // TODO: repair:
    // parse expression
    // replace untypedLambdaBox.ast with parsed AST
    // for now - throw error
    throw "ROOT AST IS NOT DECODABLE"
  }

  untypedLambdaBox.ast = decodedFirst
  untypedLambdaBox.history = untypedLambdaBox.history.map((step : StepRecord, index : number) => {
    let decodedNth : AST | null = decodeUntypedLambdaFast(step.ast) as AST

    if (decodedNth === null) {
      // TODO: repair:
      // try to take previous Step.ast and do the evaluation
      // though - remember this Step.step (number) may not be + 1 of the previous one
      // you will need to do the steps as long as need to be
      // replace decodedNth with parsed AST
      // for throw
      throw "CURRENT STEP IS NOT DECODABLE " + index
    }

    // TODO: maybe instead of this theatre just use the Core . Evalautor
    // and get real instance of ASTReduction
    let reduction : ASTReduction | undefined | null = step.lastReduction

    if (step.lastReduction === undefined) {
      reduction = null
    }

    return {
      ...step,
      lastReduction : reduction,
      ast : decodedNth, // TODO: as AST this is unsafe
    }
  })

  return untypedLambdaBox
}

export const GLOBAL_SETTINGS_ENABLER : SettingsEnabled = {
  SLI : true,
  expandStandalones : true,
  strategy : true,
}

// export const MACRO_SETTINGS_ENABLER : SettingsEnabled = {
//   SLI : true,
//   expandStandalones : false,
//   strategy : false,
// }

type PerformEvaluation = (ast : AST) => AST


export function findSimplifiedReduction (ast : AST, strategy : EvaluationStrategy, macrotable : MacroTable) : [ASTReduction, PerformEvaluation] {
  const evaluator : Evaluator =  new (strategyToEvaluator(strategy) as any)(ast) // new NormalEvaluator(ast) // TODO: get evaluator dipending on the strategy in the future
  const nextReduction = evaluator.nextReduction

  // nothing to do
  // TODO: try to contract this whole expression if it's actually known Macro
  if (evaluator.nextReduction instanceof None) {
    return [nextReduction, (ast) => ast]
  }

  if (nextReduction instanceof Expansion && nextReduction.target instanceof ChurchNumeral) {
    console.log("_________________________________ CHURCH NUMERAL EXPANSION")

    const newAst = evaluator.perform() // expand Number

    //
    // ast je cely vyraz - po performu uz modifikovany
    // newAst je ted to same jako ast
    // uvnitr celeho stromu hledam dalsi REDEX
    //
    const [newreduction, newperformevaluation] = findSimplifiedReduction(newAst, strategy, macrotable)

    // return [nextReduction, (ast) => newAst]

    if (newreduction instanceof None) {
      //
      // newAst nema zadny REDEX
      // reknu ze se ma provest expanze Churche + vratim funkci, ktera jenom vrati AST ktery je ji poslany
      // takhle to funguje proto - ze nemuzu naklonovat ast kdyz se findSimplifiedReduction zavola
      // protoze by pak nesouhlasili identifikatory a podobne --> to vede na to, ze to co mi do findSimplifiedReduction
      // je poslano - to zmodifikuju a pak proste jenom predpokladam, ze to nikomu nevadi
      // ukazka naprosto spatnyho designu provadeni redukci a faktu ze AST melo byt immutable
      //

      console.log("_________________________________ rule I. INSIDE EXPANSION")
      return [newreduction, (ast) => ast]
      // NO REDEX FOUND --> normal form, not expanding Church Numeral
      // means - I should signal normal form -- perhaps there is a problem
      // --> previous step should already be normal form
      // but this way user finds out this is terminal state only after hitting - next step manually -- possible fix?
    }
    else {
      // there's REDEX --> I know for a fact that it's not rule III. (inside the expanded expression)
      // now - because Church Numerals DON'T have arity - they are supposed to be numbers and not Macros
      // I can just forgot all the complex ruling and do the sensible thing --> perform 

      console.log("_________________________________ CHURCH EXPAND -- INSIDE EXPANSION")
      return [nextReduction, (ast) => newAst]
    }
  }

  if (nextReduction instanceof Expansion && nextReduction.target instanceof Macro) {
    console.log("_________________________________ MACRO EXPANSION")
    
    const { parent, treeSide, target, type } : Expansion = nextReduction
    
    const M : Macro = target.clone()

    const newAst = evaluator.perform()
    const expanded = parent !== null && treeSide !== null ? parent[treeSide].clone() : newAst.clone()
    // const expanded = parent !== null && treeSide !== null ? parent[treeSide] : newAst

    //
    // newAst je cely vyraz po expanzi soucasneho makra
    // v nem vyhledam dalsi REDEX
    //
    const [newreduction, newperformevaluation] = findSimplifiedReduction(newAst, strategy, macrotable)
    // const newevaluator = new NormalEvaluator(newAst)
    // const newreduction = newevaluator.nextReduction

    if (newreduction instanceof None) {
      console.log("_________________________________ rule I. INSIDE EXPANSION")
      debugger
      return [newreduction, (ast) => ast] // (ast) => ast
      // NO REDEX FOUND --> normal form, not expanding M
      // means - I should signal normal form -- perhaps there is a problem
      // --> previous step should already be normal form
      // but this way user finds out this is terminal state only after hitting - next step manually -- possible fix?
    }

    // debugger
    // node : AST = parent === null ? newAst
    //                                                     (to co jsme expandovali)
    if (parent !== null && treeSide !== null && findRedexIn(expanded, newreduction)) {
      // REDEX is completely bounded by expanded M Macro expression
      console.log("_________________________________ rule III. INSIDE EXPANSION")
      return [nextReduction, (_) => evaluator.perform()]

      // REDEX belongs to expanded M
      // --> expand the macro -- so perform the previous macro expansion
    }

    const beta : Beta = newreduction as Beta
    if (parent !== null && treeSide !== null // parent and treeSide won't be null --> parent is either APP or Lambda --> they need to parent the macro which was expanded am I right?
        && parent instanceof Application
        && parent[treeSide] instanceof Lambda && beta.redex.left.identifier === parent[treeSide].identifier
        && newreduction.type === ASTReductionType.BETA
        && parent.identifier === beta.redex.identifier) {
      console.log("_________________________________ rule IV. INSIDE")
      // rule IV.

      // if ( ! macroIsSingleStep(M)) {
      //   return [newreduction, newperformevaluation]
      // }


      const expanded : Lambda = parent[treeSide] as Lambda
      // const [fnArgNames, fnBody] = splitLambdaFn(expanded)
      // const fnBody : AST = getFnBody(expanded)
      const fnArgNames : Array<string> = getFnArgNames(expanded)
      const arity : number = fnArgNames.length
      // const arity : number = getArity(expanded)
      console.log("arity of the macro is: ", arity)
      // --> get arity of expression X which was expanded from macro M
      // it should be simple -- just go to the right for the lambda and as long as it's right side is also lambda count +1


      const macroAppRedex : MacroBeta =  extendMacroAppRedex(arity, parent, ast)
      if (strategy === EvaluationStrategy.APPLICATIVE || hasApplicativeOverride(M)) {
        console.log("............................. MACRO " + M.name() + "   has APPLICATIVE OVERRIDE")

        for (const app of macroAppRedex.applications) {
          const [argreduction, argperformevaluation] = findSimplifiedReduction(app.right, strategy, macrotable)

          if (argreduction instanceof None) {
            continue
          }
          else {
            // debugger
            // we previously expanded our M in the ast
            // recursive findSimplifiedReduction then works with that
            // so current app containes M as expanded Expression
            // we need to take that back
            
            return [argreduction, (ast : AST) => {
              // const newast : AST = argperformevaluation(ast) // original line
              app.right = argperformevaluation(app.right)

              parent[treeSide] = M
              // if (newast.identifier !== app.identifier) {
              //   app.right = newast
              //   // this is ugly hack but just checking if it works -- it doesn't
              // }
              return ast
            }]
          }
        }
      }

      // kdyz tohle mam hotove OK
      // musim se podle strategie rozhodnout co budu delat s tim polem applikaci OK
      // pokud jsem applicative strategy --> musim jit od zacatku pole applikaci OK
      // a kontrolovat ze app.right je v normalnim tvaru OK
      // pokud nektery z nich neni - tak jednoduse vezmu ten right -> reknu najdi mi redex a to je to co odsud vratim OK
      // stejne tak, pokud ma macro applicative override a nektery argument by nebyl normalni tvar OK
      // jinak pokracuju dal OK

      // return macrobeta reduction as a reduction OK
      // which is essentially just array of applications OK
      // also the TOP context needs to check the arity - not just me OK
      // the performer is just some foreach on the array of betas OK

      
      // let fnBody : AST = expanded.right
      // let fn : AST = expanded
      // const getFnBody = () => (fn as Lambda).right
      // const setFn = (tree : AST) => fn = tree
      return [macroAppRedex, (ast) => {
        // debugger
        // about SINGLE-STEP:
        // this function needs to perform all the normalisation if single-step is True
        // for that reason - I need to remember the last parent of the Extended-REDEX
        // if that last parent is null --> then it's actually the whole ast
        // THEN --> after the for loop I need to run another for loop which runs until the last parent is reduced to the normal form
        // it it's the whole tree/ast --> then it's easier
        // if it's some sub-tree than it's either APP or ABS
        // if it's Lambda -> kinda easy --> I can pick this Lambda and normalize it's right side -> then set the result to the original Lambda
        // it it's APP -> probably same - just need to decide/remember the treeside
        // for that reason - it would be best to remember also the last app
        // let's do this now
        let lastapp : AST | null = null
        let lastparent : Binary | null = null

        // debugger
        
        // budu muset projit kazdou aplikaci v poli
        // vytvorit pro ni beta redukci pro vyraz ktery vznikl v predchozi iteraci - proto nejde udelat pole beta redukci dopredu
        // a provest je - na konci vratim vysledny AST
        for (const app of macroAppRedex.applications) {
          let appParent : Binary | undefined | null = macroAppRedex.parents.shift() as Binary
          let treeSide : Child | null = appParent === undefined ? null : appParent.left.identifier === app.identifier ? Child.Left : Child.Right
          
          

          

          const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(app) // new NormalEvaluator(app)
          evaluator.reducer.perform()
          const reduced : AST = evaluator.reducer.tree

          if (appParent === undefined || treeSide === null) {
            appParent = null
            treeSide = null
            ast = reduced
            lastapp = ast
          }
          else {
            appParent[treeSide] = reduced
            lastapp = appParent[treeSide] // what about if the last parent is null?
            // that means lastapp is going to be something old and wrong right?
            // maybe it should be ast/reduced

          }

          lastparent = appParent // because I am lazy and don't want to use ifs before the for loop


          // let appParent : Binary | undefined | null = macroAppRedex.parents.shift() as Binary
          // let treeSide : Child | null = appParent === undefined ? null : appParent.left.identifier === app.identifier ? Child.Left : Child.Right
          
          // if (appParent === undefined) {
          //   appParent = null
          //   treeSide = null
          // }

          // lastparent = appParent // because I am lazy and don't want to use ifs before the for loop
          
          // const argName : string = fnArgNames.shift() as string

          // // if ((app.left as Binary).right === undefined) {
          // //   debugger
          // // }

          // const beta : Beta = new Beta(app, appParent as Binary, treeSide, (app.left as Lambda).body , argName, app.right) // getFnBody()

          // // fnBody = (fnBody as Application).right
          // // setFn(getFnBody())

          // const reducer : BetaReducer = new BetaReducer(beta, ast)
          // reducer.perform()
          // ast = reducer.tree
        }

        if (macroIsSingleStep(M)) {
          if (lastapp === null) {
            throw "This is bad, real bad."
          }
  
          if (lastparent === null) {
            // normalize the whole tree
            // top-most APP or ABS a result of the Macro-Beta
  
            while (true) {
              const [nextReduction, evaluateReduction] : [ASTReduction, any] =
                findSimplifiedReduction(ast, strategy, macrotable)
              
              if (nextReduction instanceof None) {
                return tryMacroContraction(ast, macrotable)
              }
              else {
                ast = evaluateReduction(ast)
              }
            }
          }
          else {
            const treeSide : Child = lastparent.left.identifier === lastapp.identifier ? Child.Left : Child.Right
  
            // debugger
            while (true) {
              const [nextReduction, evaluateReduction] : [ASTReduction, any] =
                findSimplifiedReduction(lastapp as AST, strategy, macrotable)
  
              if (nextReduction instanceof None) {
                lastparent[treeSide] = tryMacroContraction(lastapp as AST, macrotable)
                return ast
              }
              else {
                lastapp = evaluateReduction(lastapp)
              }
            }
          }
        }
        

        return ast // it it's not single-step Macro --> then no contraction I guess
      }]
    }

    // THIS IS WRONG --> IT'S NOT NEEDED -- INSTEAD I FIXED RULE III AND IT SHOULD BE ENOUGH
    // if (newreduction instanceof Expansion) {
    //   console.log("_________________________________ rule V. INSIDE EXPANSION")
    //   // Expansion inside Expansion
    //   // this is for cases --> when one macro needs to expanded because what it expands to is expression ->
    //   // which leads to another expansion --> because there is some Macro M2 which contains redex for example
    //   // which means - I need to actually expand 
    //   return [nextReduction, (_) => newAst]
    // }

    // if (parent !== null && treeSide !== null && ( ! findRedexIn(parent[treeSide], newreduction)))
    // this is fallbacking action
    // redex was found - but does not concern previously expanded macro - so the expansions is unnecessary
    {
      console.log("_________________________________ rule II. INSIDE THIS IS FALLBACK")
      console.log(newreduction.type)

      // REDEX is NOT inside expanded M -- NOT rule III.
      // expanded Macro is also not part of the REDEX -- NOT rule IV
      // --> not expanding M just perform the second reduction but on original tree
      return [newreduction, (ast) => {
        const resAST = newperformevaluation(newAst)
        const p = parent as AST
        const ts = treeSide as String
        (p as any)[ts as any] = M
        // // parent should be not-null
        // // because if there was a Macro which we were able to Expand
        // // and then there has been found Redex which is not part of the newly expanded sub-tree
        // // the new Redex simply has to be in different part of the tree --> which means - M (original Macro) is not the root
        return resAST
      }]
    }
  }
  else {
    console.log("_________________________________ just normal stuff")
    return [nextReduction, (ast) => evaluator.perform()]

  // {
  //   const astCopy : AST = ast.clone()
  //   const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
    
  //   if (evaluator.nextReduction instanceof None) {
  //     isNormal = true
  //     message = 'Expression is in normal form.'
      
  //     reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
  //   }

  //   setBoxState({
  //     ...state,
  //     history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal } ],

  //   })
  // }
  }
}

export function tryMacroContraction (ast : AST, macrotable : MacroTable) : AST {
  // compare the ast with all the bulti-in macros
  // compare the ast with all the user-defined macros

  if (isChurchNumeral(ast)) {
    const n : number = churchNumeralToNumber(ast as Lambda)
    const [s, z] : [string, string] = churchArgNames(ast)

    if (n === 0 && s === 's' && z === 'z') {
      return parse(tokenize(`0`, { lambdaLetters : ['λ'], singleLetterVars : false }), macrotable)
    }
    else if (n === 0 && s === 't' && z === 'f') {
      return parse(tokenize(`F`, { lambdaLetters : ['λ'], singleLetterVars : false }), macrotable)
    }

    return parse(tokenize(`${n}`, { lambdaLetters : ['λ'], singleLetterVars : false }), macrotable)
  }
  
  for (const [name, definition] of [ ...Object.entries(builtinMacros), ...Object.entries(macrotable) ]) {
    // parse the definition
    const tokens : Array<Token> = tokenize(definition, { lambdaLetters : ['λ'], singleLetterVars : false })
    const macroast : AST = parse(tokens, macrotable)

    const comparator : TreeComparator = new TreeComparator([ast, macroast])

    if (comparator.equals) {
      const macroNameAst : AST = parse(tokenize(name, { lambdaLetters : ['λ'], singleLetterVars : false }), macrotable)


      // const virtualToken : Token = new Token((macroNameAst as Macro).token.type, name, BLANK_POSITION)
      return macroNameAst // this is dirty-fix -- because the following line somehow produces macro which
      // expand incorrectly to `undefined` value
      // return new Macro(virtualToken, macrotable)
    }
  }

  return ast

  // for (const macro : )
}

function isChurchNumeral (ast : AST) : boolean {
  if ( ! (ast instanceof Lambda)) {
    return false
  }

  if ( ! (ast.body instanceof Lambda)) {
    return false
  }

  return isPeanoNumber(ast.argument.name(), ast.body.argument.name(), ast.body.body)
}

function churchArgNames (ast : AST) : [string, string] {
  return [(ast as Lambda).argument.name(), ((ast as Lambda).body as Lambda).argument.name()]
}

function isPeanoNumber (s : string, z : string, ast : AST) : boolean {
  if (ast instanceof Variable && ast.name() === z) {
    return true
  }

  if (ast instanceof Application && ast.left.toString() === s) {
    return isPeanoNumber(s, z, ast.right)
  }

  return false
}

function churchNumeralToNumber (ast : Lambda) : number {
  const s : string = ast.argument.name()
  const z : string = (ast.body as Lambda).argument.name()

  // now for the main hacky stuff
  const peanoNumber : string = (ast.body as Lambda).body.toString()
  const matches : RegExpMatchArray | null = peanoNumber.match(RegExp(s, "g"))
  
  if (matches === null) {
    return 0
  }
  else {
    return matches.length
  }
}


/**
 * Decides if the result of the application of the macro M to its arguments should evaluate to the normal form
 */
function macroIsSingleStep (macro : Macro) : boolean {
  if ([ "*", "+", "/", "-", "^", "DELTA", "=", ">", "<", ">=", "<=", "ZERO", "NOT", "AND", "OR", "PRED", "SUC" ].includes(macro.name())) {
    return true
  }

  // "T", "F" -- functioning as `if then else` --> therefore can not be Single-Step

  return false
}


// this is basic implementation
// perhaps Visitor pattern would be better
function findRedexIn (tree : AST, reduction : ASTReduction) : boolean {
  if (reduction.type === ASTReductionType.ALPHA) {
    // somehow solve this mess
    const alpha : Alpha = reduction as Alpha

    if (Array.from(alpha.conversions).some((lambda : Lambda) => tree.identifier === lambda.identifier)) {
      return true
    }
  }
  else if (reduction.type === ASTReductionType.BETA) {
    const beta : Beta = reduction as Beta
    if (beta.treeSide !== null && beta.parent !== null && tree.identifier === beta.parent[beta.treeSide].identifier) {
      return true
    }
  }
  else if (reduction.type === ASTReductionType.ETA) {
    const eta : Eta = reduction as Eta
    if (tree.identifier === eta.parent?.identifier) {
      return true
    }
  }
  else if (reduction.type === ASTReductionType.EXPANSION) {
    // debugger
    const expansion : Expansion = reduction as Expansion
    if (tree.identifier === expansion.target.identifier) {
      return true
    }
  }

  if (tree instanceof Application || tree instanceof Lambda) {
    return findRedexIn(tree.left, reduction) || findRedexIn(tree.right, reduction)
  }
  else {
    return false
  }
}

// function getArity (ast : AST) : number { 
//   if (ast instanceof Lambda) {
//     return 1 + getArity(ast.right)
//   }
//   else {
//     return 0
//   }
// }

// function splitLambdaFn (ast : AST) : [Array<string>, AST] {
//   if (ast instanceof Lambda) {
//     const [args, body] = splitLambdaFn(ast.right)
//     return [[ast.left.name(), ...args], body]
//   }
//   else {
//     return [[], ast]
//   }
// }

function getFnArgNames (ast : AST) : Array<string> {
  if (ast instanceof Lambda) {
    return [ast.left.name(), ...getFnArgNames(ast.right)]
  }
  else {
    return []
  }
}


function extendMacroAppRedex (arity : number, basepoint : Application, tree : AST) : MacroBeta {
  const extender : NormalMacroRedexExtender = new NormalMacroRedexExtender(arity, basepoint, tree)

  return new MacroBeta(extender.applications, extender.parents, arity)
}

export class MacroBeta implements ASTReduction {
  public type : ASTReductionType = ASTReductionType.GAMA
  constructor (public applications : Array<Application>, public parents : Array<AST>, public arity : number) {}
}

export class NormalMacroRedexExtender extends ASTVisitor {
  public parents : Array<AST> = []  
  public applications : Array<Application> = []

  private found : boolean = false

  constructor (private arity : number, private basepoint : AST, tree : AST) {
    super()

    tree.visit(this)
  }

  onApplication(application : Application): void {
    if (application.identifier === this.basepoint.identifier) {
      this.applications.push(application)
      this.found = true
      return
    }

    // go to the left
    // if found there - I might need to append this application to the list
    // depending on: is arity bigger than length of list? && is last application in the list the one on the left?
    // then return
    application.left.visit(this)
    if (this.found &&
      application.left.identifier === this.applications[this.applications.length - 1].identifier) {
        if (this.arity > this.applications.length) {
          this.applications.push(application)
        }

        this.parents.push(application) // pushing this APP as a parent of the previously last one in the list
        return
    }

    // go to the right
    // cause it's on the right -> it means this application is definitely not going to the list
    // so just try to find it there and return
    application.right.visit(this)
    if (this.found &&
      application.right.identifier === this.applications[this.applications.length - 1].identifier) {
        this.parents.push(application)
      }
    return
  }

  onLambda(lambda : Lambda): void {
    // lambda definitely interrupts the sequence of APPs
    // so go find the stuff in the right
    // but that's all you can do
    lambda.right.visit(this)
    if (this.found &&
      lambda.right.identifier === this.applications[this.applications.length - 1].identifier) {
        this.parents.push(lambda)
      }
    return
  }

  onChurchNumeral(ChurchNumeral : ChurchNumeral): void {
    return
  }

  onMacro(macro : Macro): void {
    return
  }

  onVariable(variable : Variable): void {
    return
  }
}

function hasApplicativeOverride (macro : Macro) : boolean {
  // TODO: implement later
  return ["*", "+", "/", "-", "^", "DELTA", "=", ">", "<", ">=", "<=", "ZERO", "NOT", "PRED", "SUC"].includes(macro.name())
  
  //  "T", "F"
  // "AND", "OR"
  // return false
}

export function strategyToEvaluator (strategy : EvaluationStrategy) : Evaluator {
  switch (strategy) {
    case EvaluationStrategy.NORMAL:
      return NormalEvaluator as any
 
    case EvaluationStrategy.APPLICATIVE:
      return ApplicativeEvaluator as any

    case EvaluationStrategy.OPTIMISATION:
      return OptimizeEvaluator as any

    case EvaluationStrategy.ABSTRACTION: // this will be removed
      return NormalAbstractionEvaluator as any // this will be removed
  }
}
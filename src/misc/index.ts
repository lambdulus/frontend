import { MacroMap } from "@lambdulus/core" // TODO: remove?


export function debounce (fn : Function, treshold : number)
 : [ (...args : Array<any>) => void, () => void ] {
  let timer : number
  
  return [
    function debounced (...args : Array<any>) : void {
      window.clearTimeout(timer)

      timer = window.setTimeout(() => {
        fn(...args)
      }, treshold)
    },
    function cancel () : void {
      window.clearTimeout(timer)
    }
  ]
}

// TODO: remove?
// export function getSavedMacros () : MacroMap {
//   return JSON.parse(window.localStorage.getItem('macrotable') || '{}')
// }

export function trimStr (str : string) : string {
  return str.trim()
}

export function mapLeftFromTo(
  from : number,
  to : number,
  sequence : Array<any>,
  fn : (...args : Array<any>) => any) {
    const result : Array<any> = new Array(to - from + 1)

    for (let e = 0, i = from; i <= to; ++i) {
      result[e++] = fn(sequence[i], i)
    }

    return result
  }

// TODO: remove?
// export const HANDY_MACROS : MacroMap = {
//   // 'Y' : '(λ f . (λ x . f (x x)) (λ x . f (x x)))',
//   // 'Z' : '(λ f . (λ y . f (λ z . y y z)) (λ y . f (λ z . y y z)))',
//   // FACT : '(Y (λ f n . (<= n 1) 1 (* n (f (- n 1)))))',
//   // FACCT : '(λ n . (Y (λ f n a . IF (= n 1) a (f (- n 1) (* n a)))) (- n 1) (n))',
//   // FIB : '(Y (λ f n . (= n 0) 0 ((= n 1) 1 ( + (f (- n 1)) (f (- n 2))))))',
//   // // SHORTLIST : 'CON 3 (CONS 5 (CONS 1 NIL))',
//   // // LONGLIST :  '(CONS 3 (CONS 5 (CONS 1 (CONS 10 (CONS 7 (CONS 2 (CONS 4 (CONS 9 (CONS 4 (CONS 6 (CONS 8 NIL)))))))))))',
//   // APPEND : 'Y (λ fn listA listB . IF (NULL listA) (listB) (CONS (FIRST listA) (fn (SECOND listA) listB)))',
//   // LISTGREQ : 'Y (λ fn piv list . IF (NULL list) (NIL) ( IF (>= (FIRST list) piv) (CONS (FIRST list) (fn piv (SECOND list))) (fn piv (SECOND list)) ) )',
//   // LISTLESS : 'Y (λ fn piv list . IF (NULL list) (NIL) ( IF (< (FIRST list) piv) (CONS (FIRST list) (fn piv (SECOND list))) (fn piv (SECOND list)) ) )',
//   // LISTGR : 'Y (λ fn piv list . IF (NULL list) (NIL) ( IF (> (FIRST list) piv) (CONS (FIRST list) (fn piv (SECOND list))) (fn piv (SECOND list)) ) )',
//   // LISTEQ : 'Y (λ fn piv list . IF (NULL list) (NIL) ( IF (= (FIRST list) piv) (CONS (FIRST list) (fn piv (SECOND list))) (fn piv (SECOND list)) ) )',
//   // QUICKSORT : 'Y (λ fn list . IF (NULL list) (NIL) ( IF (NULL (SECOND list)) (list) ( APPEND (fn (LISTLESS (FIRST list) list)) ( APPEND (LISTEQ (FIRST list) list) (fn (LISTGR (FIRST list) list)) ) ) ) )',
//   // INFLIST : '(λ n . (Y (λ x . (λ f s g . g f s) n x)))',
//   // REMOVENTH : 'Y (λ fn list n . IF (= n 0) (SECOND list) (IF (NULL list) NIL (CONS (FIRST list) (fn (SECOND list) (- n 1) ) ) ) )',
//   // NTH : 'Y (λ fn list n . IF (= n 0) (FIRST list) (IF (NULL (list)) NIL (fn (SECOND list) (- n 1)) ) )',
//   // LEN : 'Y (λ fn list . IF (NULL list) (0) (+ 1 (fn (SECOND list) )) )',
//   // GETNTH : '(λ end . (Y (λ f n i . (end i) (i) ( (= n 0) (Y (λ f a . (end a) (i) (f) ) ) (f (- n 1)) ) )) )',
//   // MAP : '(λ fn l . (Y (λ f it . IF (NULL it) (NIL) (CONS (fn (FIRST it)) (f (SECOND it))) )) l )',
//   // REDUCE : '(λ fn l init . Y (λ f it acc . IF (NULL it) (acc) (f (SECOND it) (fn (FIRST it) acc)) ) l init )',
//   // APPLY : '(λ f args . Y (λ ff f l . (NULL l) (f) (ff (f (FIRST l)) (SECOND l)) ) f args )',
//   // RANGE : '(λ m n . Y (λ f e . (= e n) (CONS e NIL) (CONS e (f (+ e 1))) ) m )',
//   // LISTCOMPR : '(λ args . APPLY (λ op in rng cond . Y (λ f l . (NULL l) (NIL) ( (cond (FIRST l)) (CONS (op (FIRST l)) (f (SECOND l))) (CONS (FIRST l) (f (SECOND l))) ) ) rng ) args )',
//   // MOD : '(λ n m . (n (λ n . (= n (- m 1)) (0) (+ n 1)) (0)) )',
//   // INFIX : 'APPLY (λ l op r . op l r)',
// }

// TODO: remove?
// export function updateMacros (macroTable : MacroMap) : void {
//   window.localStorage.setItem('macrotable', JSON.stringify(macroTable))
// }

export function reportEvent (category : string, action : string, label : string) : void {
  try {
    const tracker = (window as any).ga.getAll()[0]
    
    tracker.send('event', category, action, label )
  }
  catch (exception) {
    // TODO: fix?
    // instead of printing to the console - show notification on the web
    // console.log("")
    // console.log('PLEASE DISABLE YOUR ADBLOCKER OR ALLOW GOOGLE ANALYTICS FOR THIS SITE')
    // console.log("")
    // console.error(exception)
  }
}
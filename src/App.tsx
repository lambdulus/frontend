import React, { Component } from 'react'

import './App.css'

import  { loadAppStateFromStorage
        , updateAppStateToStorage
        , updateNotebookStateToStorage
        , loadTourState
        , CLEAR_NOTEBOOK_CONFIRMATION
        , RESET_WORKSPACE_CONFIRMATION
        , createEmptyNotebook
        , createManualNotebook } from './Constants'

import { uniqueKey } from './uniqueKey'

import TopBar from './components/TopBar'
import Tour from './components/Tour'
import Notebook, { syncDocksToFocus } from './screens/Notebook'
import { Accent, BoxStyle, AppState, NotebookState, GlobalSettings, BoxType, BoxState } from './Types'
import { CODE_NAME as UNTYPED_LAMBDA_CODE_NAME, createNewUntypedLambdaBoxFromSource, createNewUntypedLambdaExpression, defaultSettings, SETTINGS_OPENED_EVENT } from './untyped-lambda-integration/Constants'
import { UntypedLambdaState, UntypedLambdaSettings, EvaluationStrategy, UntypedLambdaType } from './untyped-lambda-integration/Types'
import { MacroTable } from '@lambdulus/core'
import { Theme, ThemeContext } from './contexts/Theme'
import { SettingsContext } from './contexts/Settings'


export default class App extends Component<{}, AppState> {
  constructor (props : {}) {
    super(props)

    console.log(`VERSION: ${import.meta.env.VITE_VERSION_INFO}`)
    console.log(`COMMIT: ${import.meta.env.VITE_COMMIT}`)


    this.state = loadAppStateFromStorage()

    this.updateNotebook = this.updateNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importNotebook = this.importNotebook.bind(this)
    this.clearNotebook = this.clearNotebook.bind(this)
    this.resetWorkspace = this.resetWorkspace.bind(this)
    this.updateAccent = this.updateAccent.bind(this)
    this.previewAccent = this.previewAccent.bind(this)
    this.previewBoxStyle = this.previewBoxStyle.bind(this)
    this.updateBoxStyle = this.updateBoxStyle.bind(this)
    this.updateConfirmBoxDelete = this.updateConfirmBoxDelete.bind(this)
    this.toggleTheme = this.toggleTheme.bind(this)
    this.selectNotebook = this.selectNotebook.bind(this)
    this.addNotebook = this.addNotebook.bind(this)
    this.removeNotebook = this.removeNotebook.bind(this)

    this.createNotebookFromURL = this.createNotebookFromURL.bind(this)
    this.openTour = this.openTour.bind(this)
    this.closeTour = this.closeTour.bind(this)
    this.addTourLambdaBox = this.addTourLambdaBox.bind(this)
    this.fillTourBoxEditor = this.fillTourBoxEditor.bind(this)
    this.setTourBoxSettings = this.setTourBoxSettings.bind(this)
    this.showTourBoxMacros = this.showTourBoxMacros.bind(this)
    this.hideTourBoxMacros = this.hideTourBoxMacros.bind(this)
    this.deleteTourBox = this.deleteTourBox.bind(this)
    this.setZenMode = this.setZenMode.bind(this)
    this.setTourZenMode = this.setTourZenMode.bind(this)

    // First load ever opens the guided tour; afterwards only the top-bar
    // icon opens it, resuming the saved step. Transient UI state, same as
    // the accent previews below — never part of AppState.
    this.tourOpen = loadTourState() === null
  }

  private tourOpen : boolean

  openTour () : void {
    this.tourOpen = true
    this.forceUpdate()
  }

  closeTour () : void {
    this.tourOpen = false
    this.forceUpdate()
  }

  // Tour chauffeur callbacks: the tour conducts box creation, filling and
  // deletion through the same state path as the real UI, so chauffeured
  // boxes are indistinguishable from hand-made ones.
  tourSettings () : UntypedLambdaSettings | null {
    const notebook : NotebookState | undefined = this.state.notebooks[this.state.activeNotebookIndex]

    if (notebook === undefined || notebook.locked === true) {
      return null
    }

    return (notebook.settings[UNTYPED_LAMBDA_CODE_NAME] as UntypedLambdaSettings | undefined) ?? defaultSettings
  }

  // An empty λ box in the active notebook; null when locked or missing.
  addTourLambdaBox () : string | null {
    const settings : UntypedLambdaSettings | null = this.tourSettings()

    if (settings === null) {
      return null
    }

    const { notebooks, activeNotebookIndex } = this.state
    const box : UntypedLambdaState = createNewUntypedLambdaExpression(settings)
    const boxList : Array<BoxState> = [ ...notebooks[activeNotebookIndex].boxList, box ]
    this.updateNotebook({ boxList, activeBoxIndex : boxList.length - 1 })

    return box.__key
  }

  fillTourBoxEditor (boxKey : string, content : string) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const boxList : Array<BoxState> = notebooks[activeNotebookIndex].boxList.map((box : BoxState) =>
      box.__key === boxKey && box.type === BoxType.UNTYPED_LAMBDA ?
        { ...(box as UntypedLambdaState), editor : { ...(box as UntypedLambdaState).editor, content, syntaxError : null } }
      :
        box
    )
    this.updateNotebook({ boxList })
  }

  // Explicit settings value through fresh store state: the title-bar gear
  // is a render-closure toggle, so working it programmatically would read
  // stale props whenever the bar skipped a render.
  setTourBoxSettings (boxKey : string, open : boolean) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const boxList : Array<BoxState> = notebooks[activeNotebookIndex].boxList.map((box : BoxState) =>
      box.__key === boxKey && box.type === BoxType.UNTYPED_LAMBDA ?
        { ...(box as UntypedLambdaState), settingsOpen : open }
      :
        box
    )
    this.updateNotebook({ boxList })

    if (open) {
      // Conducted opens dismiss other boxes' panels like gear opens do.
      document.dispatchEvent(new CustomEvent<{ key : string }>(SETTINGS_OPENED_EVENT, { detail : { key : boxKey } }))
    }
  }

  // The macros step demonstrates the dock, then steps out of the way:
  // leaving for share collapses the display while the want survives —
  // Back re-opens it on arrival, zen entry forgets it right after — so
  // the next step never starts obstructed.
  hideTourBoxMacros (boxKey : string) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const boxList : Array<BoxState> = notebooks[activeNotebookIndex].boxList.map((box : BoxState) =>
      box.__key === boxKey && box.type === BoxType.UNTYPED_LAMBDA ?
        { ...(box as UntypedLambdaState), macrolistOpen : false }
      :
        box
    )
    this.updateNotebook({ boxList })
  }

  // Atomic panel handoff for the macros step: one commit closes settings
  // and opens the dock, so two toggles can never resurrect each other's
  // stale key through the box replace. Setting values, not toggling, so
  // an already-open dock simply stays open.
  showTourBoxMacros (boxKey : string) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const boxList : Array<BoxState> = notebooks[activeNotebookIndex].boxList.map((box : BoxState) =>
      box.__key === boxKey && box.type === BoxType.UNTYPED_LAMBDA ?
        { ...(box as UntypedLambdaState), settingsOpen : false, macrolistOpen : true, macrolistWanted : true }
      :
        box
    )
    this.updateNotebook({ boxList })
  }

  // One zen road for the switch and the tour: entering closes every macro
  // table FORGETFULLY — the want is cleared, not just collapsed — so
  // nothing springs back open on the way back out. A dock demonstrated
  // mid-tour stays shut after the finale; a dock opened mid-zen still
  // restores on leaving, and focus memory across box switches (which
  // never passes through here) is untouched.
  setZenMode (zenMode : boolean) : void {
    const { boxList, focusedBoxIndex, activeBoxIndex } = this.state.notebooks[this.state.activeNotebookIndex]
    const entered : Array<BoxState> = zenMode ? boxList.map((box : BoxState) =>
      box.type === BoxType.UNTYPED_LAMBDA ?
        { ...(box as UntypedLambdaState), macrolistOpen : false, macrolistWanted : false }
      :
        box
    ) : boxList
    this.updateNotebook({
      zenMode,
      boxList : syncDocksToFocus(entered, zenMode ? null : (focusedBoxIndex ?? activeBoxIndex), zenMode),
    })
  }

  // Explicit zen value for the finale steps: setting, never toggling,
  // so an already-zen notebook simply stays zen.
  setTourZenMode (zenMode : boolean) : void {
    this.setZenMode(zenMode)
  }

  // Same nearest-valid-index rule as the notebook's own removeBox.
  deleteTourBox (boxKey : string) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const boxList : Array<BoxState> = notebooks[activeNotebookIndex].boxList
    const index : number = boxList.findIndex((box : BoxState) => box.__key === boxKey)

    if (index === -1) {
      return
    }

    const nearestValidIndex = (i : number) => {
      if (i < activeNotebookIndex) return activeNotebookIndex - 1
      if (i > activeNotebookIndex) return activeNotebookIndex
      if (boxList.length === 1) return NaN
      if (i === 0) return i
      return i - 1
    }

    this.updateNotebook({
      boxList : boxList.filter((box : BoxState) => box.__key !== boxKey),
      activeBoxIndex : nearestValidIndex(index),
    })
  }

  componentDidMount () : void {
    this.createNotebookFromURL()
  }

  // TODO: all of this needs to be moved to more apropriate component

  // I don't think it should get moved to the component, standalone helper function would be OK
  // OR -> split it --> there will be very simple top level abstraction implementation
  // and according the type of the BOX - specific Integration Module will handle the actual deserialization
  // true when a shared-link notebook was installed (and its setState queued).
  createNotebookFromURL () : boolean {
    const urlSearchParams : URLSearchParams = new URL(window.location.toString()).searchParams
    const type : string | null = urlSearchParams.get('type')

    if (type === null) {
      return false
    }

    switch (type) {
      case BoxType.UNTYPED_LAMBDA: {
        const source : string | null = urlSearchParams.get('source')
        const macros : string | null = urlSearchParams.get('macros')
        const subtype : string | null = urlSearchParams.get('subtype')
        const strategy : string | null = urlSearchParams.get('strategy')
        const SDE : string | null = urlSearchParams.get('SDE')
        const SLI : string | null = urlSearchParams.get('SLI')
        if (source === null || macros == null || subtype === null || strategy === null || SDE === null || SLI === null) {
          return false
        }

        // Newer settings params are optional: years-old links predate
        // them and fall back to the defaults instead of failing.
        const ETA : string | null = urlSearchParams.get('ETA')
        const expandStandalones : string | null = urlSearchParams.get('expandStandalones')
        const collapseOldSteps : string | null = urlSearchParams.get('collapseOldSteps')

        const strat : EvaluationStrategy = EvaluationStrategy.NORMAL === strategy ? EvaluationStrategy.NORMAL : EvaluationStrategy.APPLICATIVE

        const sli : boolean = SLI === 'true' ? true : false

        const settings : UntypedLambdaSettings = {
          ...defaultSettings,
          strategy : strat,
          SDE : SDE === 'true' ? true : false,
          SLI : sli,
          ETA : ETA === null ? defaultSettings.ETA : ETA === 'true',
          expandStandalones : expandStandalones === null ? defaultSettings.expandStandalones : expandStandalones === 'true',
          collapseOldSteps : collapseOldSteps === null ? defaultSettings.collapseOldSteps : collapseOldSteps === 'true',
        }

        const sub : UntypedLambdaType = subtype === UntypedLambdaType.EMPTY ?
            UntypedLambdaType.EMPTY
          :
            subtype === UntypedLambdaType.ORDINARY ?
              UntypedLambdaType.ORDINARY
            :
              subtype === UntypedLambdaType.EXERCISE ?
                UntypedLambdaType.EXERCISE
              :
                UntypedLambdaType.EMPTY

        try {
          const macrotable : MacroTable = JSON.parse(decodeURI(macros))

          const box : UntypedLambdaState = createNewUntypedLambdaBoxFromSource(decodeURI(source), settings, sub, macrotable)
          const notebook : NotebookState = createNewNotebookWithBox('Shared', box, { [UNTYPED_LAMBDA_CODE_NAME] : settings })
          const notebooks : Array<NotebookState> = [ ...this.state.notebooks, notebook ]

          this.setState({
            notebooks,
            activeNotebookIndex : notebooks.length - 1,
          })

          window.history.pushState(null, '', '/') // TODO: decide if remove or leave

          updateAppStateToStorage({
            ...this.state,
            notebooks,
            activeNotebookIndex : notebooks.length - 1,
          })

          return true
        }
        catch (ex) {
          window.history.replaceState(null, '', '/') // TODO: decide if remove or leave
          return false
        }
      }
      break
      default:
        break;
    }

    return false
  }

  // Hover previews of accent theme and box style: transient pointer state,
  // deliberately kept out of AppState so it can never persist or restore
  // from storage.
  private accentPreview : Accent | null = null
  private boxStylePreview : BoxStyle | null = null

  previewAccent (accent : Accent | null) : void {
    this.accentPreview = accent
    this.forceUpdate()
  }

  previewBoxStyle (boxStyle : BoxStyle | null) : void {
    this.boxStylePreview = boxStyle
    this.forceUpdate()
  }

  // NOTE: render is OK
  render () {
    const { notebooks, activeNotebookIndex, theme, accent, boxStyle, confirmBoxDelete } = this.state
    const notebook : NotebookState = notebooks[activeNotebookIndex]
    const { settings } = notebook

    const darkmode = theme === Theme.Dark

    return (
      <ThemeContext.Provider value={ theme }>
        <SettingsContext.Provider value={ settings }>

          <div id='app' className={ darkmode ? 'dark' : 'light' } data-accent={ this.accentPreview ?? accent } data-box-style={ this.boxStylePreview ?? boxStyle }>
            <div id="bad-screen-message">
              Lambdulus only runs on screens at least 900 pixels wide.
            </div>
            <TopBar
              notebooks={ notebooks }
              activeNotebookIndex={ activeNotebookIndex }
              theme={ theme }
              accent={ accent }
              boxStyle={ boxStyle }
              confirmBoxDelete={ confirmBoxDelete ?? true }
              onConfirmBoxDeleteChange={ this.updateConfirmBoxDelete }
              settings={ settings }
              onAccentChange={ this.updateAccent }
              onAccentPreview={ this.previewAccent }
              onBoxStylePreview={ this.previewBoxStyle }
              onBoxStyleChange={ this.updateBoxStyle }
              onNotebookSelect={ this.selectNotebook }
              onNotebookAdd={ this.addNotebook }
              onNotebookRemove={ this.removeNotebook }
              onImport={ this.importNotebook }
              onClearNotebook={ this.clearNotebook }
              onResetWorkspace={ this.resetWorkspace }
              onDarkModeChange={ this.toggleTheme }
              onSettingsChange={ this.updateSettings }
              onZenModeChange={ this.setZenMode }
              onTourOpen={ this.openTour }
            />

            <Notebook
              state={ notebook }
              updateNotebook={ this.updateNotebook }
              confirmBoxDelete={ confirmBoxDelete ?? true }
              onConfirmBoxDeleteChange={ this.updateConfirmBoxDelete }
            />

            {
              this.tourOpen ?
                <Tour
                  initialStep={ loadTourState()?.step ?? 'welcome' }
                  onClose={ this.closeTour }
                  onAddLambdaBox={ this.addTourLambdaBox }
                  onFillBoxEditor={ this.fillTourBoxEditor }
                  onSetBoxSettings={ this.setTourBoxSettings }
                  onShowBoxMacros={ this.showTourBoxMacros }
                  onHideBoxMacros={ this.hideTourBoxMacros }
                  onDeleteBox={ this.deleteTourBox }
                  onSetZenMode={ this.setTourZenMode }
                />
              :
                null
            }
          </div>

        </SettingsContext.Provider>
      </ThemeContext.Provider>
    )
  }

  updateNotebook (notebookPatch : Partial<NotebookState>) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const newNotebook = { ...notebooks[activeNotebookIndex], ...notebookPatch }
    const newNotebooks = [ ...notebooks ]
    newNotebooks[activeNotebookIndex] = newNotebook

    this.setState({ notebooks : newNotebooks })

    updateNotebookStateToStorage(activeNotebookIndex, newNotebook)
  }

  importNotebook (notebook : NotebookState) : void {
    const notebooks : Array<NotebookState> = [ ...this.state.notebooks, notebook ]

    this.setState({
      notebooks,
      activeNotebookIndex : notebooks.length - 1,
    })

    updateAppStateToStorage({
      ...this.state,
      notebooks,
      activeNotebookIndex : notebooks.length - 1,
    })
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const newNotebook = { ...notebooks[activeNotebookIndex], settings : newSettings }
    const newNotebooks = [ ...notebooks ]
    newNotebooks[activeNotebookIndex] = newNotebook


    this.setState({ notebooks : newNotebooks })
    updateNotebookStateToStorage(activeNotebookIndex, newNotebook)
  }

  clearNotebook () : void {
    const { notebooks, activeNotebookIndex } = this.state
    const notebook : NotebookState = notebooks[activeNotebookIndex]

    if (notebook.locked) {
      return
    }

    if (window.confirm(CLEAR_NOTEBOOK_CONFIRMATION)) {
      const cleared : NotebookState = {
        ...notebook,
        boxList : [],
        activeBoxIndex : NaN,
        focusedBoxIndex : undefined,
      }
      const newNotebooks = [ ...notebooks ]
      newNotebooks[activeNotebookIndex] = cleared

      this.setState({ notebooks : newNotebooks })
      updateNotebookStateToStorage(activeNotebookIndex, cleared)
    }
  }

  resetWorkspace () : void {
    if (window.confirm(RESET_WORKSPACE_CONFIRMATION)) {
      const notebooks : Array<NotebookState> = [ createManualNotebook(), createEmptyNotebook('Notebook') ]

      this.setState({
        notebooks,
        activeNotebookIndex : 1,
      })

      updateAppStateToStorage({
        ...this.state,
        notebooks,
        activeNotebookIndex : 1,
      })
    }
  }

  selectNotebook (index : number) : void {
    const { notebooks } = this.state

    if (index < 0 || index >= notebooks.length) {
      return
    }

    this.setState({ activeNotebookIndex : index })

    updateAppStateToStorage({
      ...this.state,
      activeNotebookIndex : index,
    })
  }

  addNotebook () : void {
    const { notebooks, activeNotebookIndex } = this.state
    const names = notebooks.map((notebook : NotebookState) => notebook.name)

    let name : string = 'Notebook'
    let counter : number = 2
    while (names.indexOf(name) !== -1) {
      name = `Notebook ${counter}`
      counter++
    }

    // Zen is uninterrupted focus: a new notebook opened from inside it
    // stays in it instead of dropping the user out without warning.
    const fresh : NotebookState = createEmptyNotebook(name)
    if (notebooks[activeNotebookIndex]?.zenMode === true) {
      fresh.zenMode = true
    }

    const newNotebooks = [ ...notebooks, fresh ]

    this.setState({
      notebooks : newNotebooks,
      activeNotebookIndex : newNotebooks.length - 1,
    })

    // A fresh notebook is a new document: park the page at the top.
    // Without this the previous notebook's scroll position carries
    // over and clamps into the short new content, hiding the title
    // one line up. Instant: there is no travel to glide through.
    window.scrollTo({ top : 0, behavior : 'auto' })

    updateAppStateToStorage({
      ...this.state,
      notebooks : newNotebooks,
      activeNotebookIndex : newNotebooks.length - 1,
    })
  }

  removeNotebook (index : number) : void {
    const { notebooks, activeNotebookIndex } = this.state

    if (index < 0 || index >= notebooks.length || notebooks[index].locked) {
      return
    }

    let newNotebooks : Array<NotebookState> = notebooks.filter((notebook : NotebookState, i : number) => i !== index)
    if (newNotebooks.length === 0) {
      newNotebooks = [ createEmptyNotebook('Notebook') ]
    }

    const newActiveIndex : number =
      index < activeNotebookIndex ? activeNotebookIndex - 1
      : index === activeNotebookIndex ? Math.min(index, newNotebooks.length - 1)
      : activeNotebookIndex

    this.setState({
      notebooks : newNotebooks,
      activeNotebookIndex : newActiveIndex,
    })

    updateAppStateToStorage({
      ...this.state,
      notebooks : newNotebooks,
      activeNotebookIndex : newActiveIndex,
    })
  }

  toggleTheme () : void {
    const { theme } = this.state
    const opposite = theme === Theme.Dark ? Theme.Light : Theme.Dark

    this.setState({ theme : opposite })
    updateAppStateToStorage({ ...this.state, theme : opposite })
  }

  updateAccent (accent : Accent) : void {
    this.accentPreview = null
    this.setState({ accent })
    updateAppStateToStorage({ ...this.state, accent })
  }

  updateBoxStyle (boxStyle : BoxStyle) : void {
    this.boxStylePreview = null
    this.setState({ boxStyle })
    updateAppStateToStorage({ ...this.state, boxStyle })
  }

  updateConfirmBoxDelete (confirmBoxDelete : boolean) : void {
    this.setState({ confirmBoxDelete })
    updateAppStateToStorage({ ...this.state, confirmBoxDelete })
  }

}

function createNewNotebookWithBox (name : string, box : BoxState, settings : GlobalSettings) : NotebookState {
  return {
    name,
    boxList : [ box ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    settings,

    menuOpen : false,

    __key : uniqueKey(),
  }
}
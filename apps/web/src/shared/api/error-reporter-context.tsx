import { createContext, type ParentProps, useContext } from 'solid-js'
import type { ErrorReporter } from './error-reporter'

/** Sends nothing: what a screen outside the app, such as one under test, reports to. */
const silent: ErrorReporter = { report: () => undefined, setRoute: () => undefined }

const ErrorReporterContext = createContext<ErrorReporter>(silent)

export function ErrorReporterProvider(props: ParentProps<{ reporter: ErrorReporter }>) {
  return <ErrorReporterContext.Provider value={props.reporter}>{props.children}</ErrorReporterContext.Provider>
}

export function useErrorReporter(): ErrorReporter {
  return useContext(ErrorReporterContext)
}

export const en = {
  home: {
    title: 'Monorepo template'
  },
  apiStatus: {
    checking: 'Checking the API…',
    up: 'The API is up: {{service}} at {{timestamp}}',
    unreachable: 'Cannot reach the API.',
    unexpected: 'The API answered something unexpected.',
    error: 'The API answered an error.',
    errorWithCode: 'The API answered an error ({{code}}).',
    unknown: 'Something went wrong.'
  }
}

/** The shape every language must have: the English dictionary. */
export type Messages = typeof en

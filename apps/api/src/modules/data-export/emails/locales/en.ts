export const en = {
  exportReady: {
    subject: 'The export of {organization} is ready',
    body: 'The data of {organization} you asked for is ready: a zip file with a spreadsheet for each kind of record. Download it from the organization’s settings by {expires}; after that day it is deleted, and you can ask for a new one.',
    action: 'Open the settings',
    footer:
      'You get this email because you asked for this export. If you did not, change your password and look at who owns {organization}.'
  }
}

/** The shape every language must have: the English texts. */
export type DataExportEmailTexts = typeof en

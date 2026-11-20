import type { DataExportEmailTexts } from './en'

export const es: DataExportEmailTexts = {
  exportReady: {
    subject: 'La exportación de {organization} está lista',
    body: 'Los datos de {organization} que pediste están listos: un archivo zip con una hoja de cálculo por cada tipo de registro. Descárgalo desde la configuración de la organización hasta el {expires}; después de ese día se elimina y puedes pedir uno nuevo.',
    action: 'Abrir la configuración',
    footer:
      'Recibes este correo porque pediste esta exportación. Si no fuiste tú, cambia tu contraseña y revisa quién es propietario de {organization}.'
  }
}

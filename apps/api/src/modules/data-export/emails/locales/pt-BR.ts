import type { DataExportEmailTexts } from './en'

export const ptBR: DataExportEmailTexts = {
  exportReady: {
    subject: 'A exportação de {organization} está pronta',
    body: 'Os dados de {organization} que você pediu estão prontos: um arquivo zip com uma planilha para cada tipo de registro. Baixe pelas configurações da organização até {expires}; depois desse dia ele é apagado, e você pode pedir outro.',
    action: 'Abrir as configurações',
    footer:
      'Você recebe este email porque pediu esta exportação. Se não foi você, troque sua senha e veja quem é dono de {organization}.'
  }
}

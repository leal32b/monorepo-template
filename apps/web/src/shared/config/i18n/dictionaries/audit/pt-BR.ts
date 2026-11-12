import type { auditEn } from './en'

export const auditPtBR: typeof auditEn = {
  activity: {
    title: 'Atividade',
    unavailable: 'Não conseguimos carregar a atividade. Confira sua conexão e tente de novo.',
    noAccess: {
      title: 'Você não pode ver a atividade aqui',
      description: 'Seu papel em {{name}} não a inclui. Peça a um proprietário ou a um administrador.'
    },
    section: {
      title: 'Mudanças recentes',
      description: 'Quem mudou o quê em {{name}}, das mais novas às mais antigas. Guardadas por um ano.'
    },
    empty: {
      title: 'Nada mudou ainda',
      description: 'Quando alguém adicionar ou mudar um registro, isso aparece aqui com quem fez e quando.'
    },
    actors: {
      formerMember: 'Alguém que não é mais membro',
      visitor: 'Uma visita, pela sua página pública',
      system: 'O sistema'
    },
    entries: {
      customer: {
        created: 'Adicionou um cliente',
        updated: 'Editou um cliente',
        archived: 'Arquivou um cliente',
        restored: 'Restaurou um cliente',
        deleted: 'Excluiu um cliente'
      }
    },
    changed: '{{what}}: {{fields}}',
    fields: {
      customer: { name: 'nome', email: 'e-mail', phone: 'telefone', company: 'empresa', notes: 'anotações' }
    },
    pager: {
      label: 'Páginas da atividade',
      previous: 'Mais novas',
      next: 'Mais antigas',
      page: 'Página {{page}}'
    }
  }
}

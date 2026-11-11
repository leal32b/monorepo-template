import type { customersEn } from './en'

export const customersPtBR: typeof customersEn = {
  customers: {
    title: 'Clientes',
    unavailable: 'Não foi possível carregar seus clientes. Verifique sua conexão e tente de novo.',
    noAccess: {
      title: 'Você não pode ver os clientes aqui',
      description: 'O seu papel em {{name}} não inclui isso. Peça a um proprietário ou a um administrador.'
    },
    section: {
      title: 'Clientes',
      description: 'As pessoas e empresas com quem {{name}} trabalha.',
      readOnly: 'As pessoas e empresas com quem {{name}} trabalha. Você pode ver, mas não alterar.'
    },
    search: {
      label: 'Buscar clientes',
      submit: 'Procurar'
    },
    filter: {
      label: 'Mostrar',
      active: 'Ativos',
      archived: 'Arquivados'
    },
    add: {
      title: 'Adicionar cliente',
      description: 'Guarde os dados e as anotações num só lugar.',
      go: 'Adicionar'
    },
    actions: {
      edit: 'Editar',
      archive: 'Arquivar',
      restore: 'Restaurar',
      delete: 'Excluir'
    },
    archivedBadge: 'Arquivado',
    empty: {
      title: 'Ainda não há clientes',
      description: 'Os clientes que você adicionar aparecem aqui.',
      archivedTitle: 'Nada arquivado',
      archivedDescription: 'Um cliente arquivado fica aqui até você restaurar ou excluir.',
      noResultsTitle: 'Nenhum cliente encontrado',
      noResults: 'Nenhum cliente corresponde a “{{search}}”. Confira a grafia ou busque por menos.'
    },
    form: {
      name: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      company: 'Empresa',
      notes: 'Anotações',
      create: 'Adicionar cliente',
      save: 'Salvar alterações'
    },
    errors: {
      nameRequired: 'Informe o nome do cliente.',
      nameTooLong: 'Use até {{max}} caracteres.',
      emailInvalid: 'Informe um e-mail como ana@example.com.',
      phoneTooLong: 'Use até {{max}} caracteres.',
      companyTooLong: 'Use até {{max}} caracteres.',
      notesTooLong: 'Use até {{max}} caracteres.',
      emailTaken: 'Outro cliente já tem este e-mail.',
      gone: 'Este cliente não existe mais. A lista já está atualizada.',
      notAllowed: 'O seu papel não permite isso.',
      changed: 'Alguém alterou este cliente antes. A lista já está atualizada.'
    },
    saved: '{{name}} foi salvo.',
    archive: {
      archived: '{{name}} foi arquivado. Dá para restaurar na lista de arquivados.',
      restored: '{{name}} está ativo de novo.'
    },
    remove: {
      warning: 'Excluir {{name}} para sempre? Os dados e as anotações não podem ser recuperados.',
      submit: 'Excluir cliente',
      removed: '{{name}} foi excluído.'
    },
    pager: {
      previous: 'Anterior',
      next: 'Próxima',
      page: 'Página {{page}} de {{pages}}'
    }
  }
}

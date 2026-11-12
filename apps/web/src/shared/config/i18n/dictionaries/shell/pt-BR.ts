import type { shellEn } from './en'

export const shellPtBR: typeof shellEn = {
  app: {
    name: 'Monorepo Template'
  },
  home: {
    title: 'Início',
    empty: {
      title: 'Nada por aqui ainda',
      description: 'O que {{name}} fizer vai aparecer aqui.'
    },
    gettingStarted: {
      title: 'Primeiros passos',
      description: 'Alguns passos para configurar {{name}}.',
      invite: {
        title: 'Convidar pessoas',
        description: 'Chame sua equipe para {{name}}.',
        go: 'Convidar pessoas'
      }
    }
  },
  /** Words that buttons share across screens. */
  actions: {
    cancel: 'Cancelar',
    retry: 'Tentar de novo'
  },
  notFound: {
    title: 'Página não encontrada',
    description: 'O endereço pode estar errado, ou a página pode ter mudado.',
    organization:
      'Páginas de uma organização da qual você não faz parte aparecem assim. Se era uma delas, peça um convite a alguém de lá.',
    home: 'Ir para o início'
  },
  appShell: {
    loading: 'Carregando…',
    slow: 'Está demorando mais que o normal. Se o app estava parado, o servidor pode levar até um minuto para acordar.',
    search: 'Buscar',
    palette: {
      title: 'Paleta de comandos',
      placeholder: 'Busque telas e ações…',
      empty: 'Nada encontrado. Tente outra palavra.',
      go: 'Ir para',
      actions: 'Ações',
      theme: {
        system: 'Usar o tema do sistema',
        light: 'Usar o tema claro',
        dark: 'Usar o tema escuro'
      },
      keywords: {
        general: 'organização nome endereço excluir',
        members: 'pessoas equipe convidar remover papel',
        roles: 'permissões acesso',
        customers: 'clientes contatos pessoas empresas',
        create: 'organização nova equipe',
        profile: 'conta nome e-mail',
        security: 'senha duas etapas verificação autenticador códigos backup google',
        preferences: 'aparência tema idioma',
        theme: 'aparência cor escuro claro',
        signOut: 'sair logout desconectar'
      }
    },
    openMenu: 'Abrir o menu',
    closeMenu: 'Fechar o menu',
    menu: 'Menu',
    breadcrumb: 'Você está em',
    nav: {
      main: 'Principal',
      home: 'Início',
      settings: 'Configurações',
      back: 'Voltar ao app',
      account: 'Sua conta',
      profile: 'Perfil',
      security: 'Segurança',
      preferences: 'Preferências',
      organization: 'Organização',
      general: 'Geral',
      members: 'Membros',
      roles: 'Papéis',
      customers: 'Clientes'
    },
    account: {
      settings: 'Configurações',
      signOut: 'Sair'
    },
    organizations: {
      label: 'Suas organizações',
      create: 'Criar organização'
    }
  },
  session: {
    unavailable: {
      title: 'Não conseguimos verificar seu login',
      description: 'Confira sua conexão e tente de novo.'
    }
  },
  failure: {
    network: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.',
    rateLimited: 'Muitas tentativas. Espere um minuto e tente de novo.',
    unexpected: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
    reference: 'Se continuar, informe ao suporte: {{reference}}'
  }
}

import type { backOfficeEn } from './en'

export const backOfficePtBR: typeof backOfficeEn = {
  backOffice: {
    name: 'Back office',
    nav: {
      label: 'Back office',
      organizations: 'Organizações',
      users: 'Usuários',
      app: 'Voltar ao app'
    },
    unavailable: 'Não foi possível carregar o back office. Verifique sua conexão e tente de novo.',
    refused: {
      title: 'Entre de novo para abrir o back office',
      'two-factor': 'Sua conta não tem verificação em duas etapas. Ative-a em Segurança e entre de novo.',
      'sign-in-method': 'Sua conta também entra com o Google, que não pede código. Desvincule-o em Segurança.',
      'sign-in-again':
        'O back office pede uma entrada com senha e código nas últimas 12 horas, depois que você virou operador.',
      action: 'Entrar de novo'
    },
    status: {
      trialing: 'Teste',
      active: 'Ativa',
      past_due: 'Pagamento atrasado',
      cancelled: 'Encerrada',
      readOnly: 'Somente leitura'
    },
    organizations: {
      title: 'Organizações',
      search: 'Buscar por nome, endereço ou e-mail do dono',
      section: {
        title: 'Todas as organizações',
        description: 'Das mais novas às mais antigas. Abra uma para ver o estado e entrar como o dono vê.'
      },
      row: {
        owner: '{{name}} · {{email}}',
        noOwner: 'Sem dono',
        details: '/{{slug}} · {{members}} · criada em {{date}}',
        members: '{{count}} membros',
        oneMember: '1 membro'
      },
      open: 'Abrir',
      empty: {
        title: 'Nenhuma organização ainda',
        description: 'As organizações aparecem aqui conforme são criadas.',
        noResultsTitle: 'Nada encontrado',
        noResults: 'Nenhuma organização corresponde a “{{search}}”.'
      }
    },
    organization: {
      title: 'Organização',
      unavailable: 'Não foi possível carregar esta organização. Verifique sua conexão e tente de novo.',
      notFound: 'Nenhuma organização tem este endereço. Ela pode ter sido excluída.',
      state: {
        title: 'Estado',
        description: 'O que a organização é, e o que o plano permite agora.',
        address: 'Endereço',
        plan: 'Plano',
        noPlan: 'Nenhum plano escolhido ainda',
        created: 'Criada em',
        settings: 'Fuso horário e moeda'
      },
      enter: {
        section: 'Acesso',
        title: 'Ver como o dono vê',
        description:
          'Somente leitura, por 30 minutos. O registro de atividades dela anota quando você entra e sai, com seu nome.',
        go: 'Entrar',
        active: 'Você está dentro de outra organização. Saia dela primeiro.',
        failed: 'Não foi possível entrar. Verifique sua conexão e tente de novo.'
      },
      members: {
        title: 'Membros',
        description: 'Quem faz parte dela, dos mais antigos aos mais novos.',
        joined: '{{role}} · entrou em {{date}}'
      }
    },
    users: {
      title: 'Usuários',
      search: 'Buscar por e-mail ou nome',
      section: {
        title: 'Todos os usuários',
        description: 'Dos mais novos aos mais antigos, com suas organizações.'
      },
      row: {
        lastSignIn: 'última entrada em {{date}}',
        never: 'nenhuma entrada em 30 dias',
        twoFactor: 'Duas etapas ativa',
        noOrganization: 'Nenhuma organização'
      },
      empty: {
        title: 'Nenhum usuário ainda',
        description: 'As pessoas aparecem aqui conforme se cadastram.',
        noResultsTitle: 'Nada encontrado',
        noResults: 'Nenhum usuário corresponde a “{{search}}”.'
      }
    }
  }
}

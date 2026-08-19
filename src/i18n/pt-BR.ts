export const strings = {
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    create: 'Criar',
    loading: 'Carregando…',
    tryAgain: 'Tentar novamente',
    comingSoon: 'Em breve',
    signOut: 'Sair',
  },
  errors: {
    offline: 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
    sessionExpired: 'Sua sessão expirou. Faça login novamente.',
    forbidden: 'Você não tem permissão para acessar isto.',
    notFound: 'Não encontramos o que você está procurando.',
    unexpected: 'Algo deu errado. Tente novamente em instantes.',
    supabaseNotConfigured:
      'O backend ainda não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.',
  },
  auth: {
    title: 'Entrar no Scriptly AI',
    subtitle: 'Crie roteiros que prendem atenção.',
    continueWithGoogle: 'Continuar com Google',
    signingIn: 'Entrando…',
    callbackProcessing: 'Finalizando login…',
    callbackError: 'Não foi possível concluir o login.',
  },
  onboarding: {
    title: 'Crie seu primeiro workspace',
    subtitle: 'Um workspace organiza suas marcas, produtos e roteiros.',
    nameLabel: 'Nome do workspace',
    namePlaceholder: 'Ex: Minha Agência',
    nameRequired: 'Escolha um nome para o workspace.',
    submit: 'Criar workspace',
    creating: 'Criando…',
  },
  workspace: {
    switchWorkspace: 'Trocar workspace',
    newWorkspace: 'Novo workspace',
    noWorkspaces: 'Nenhum workspace encontrado',
  },
  dashboard: {
    title: 'Dashboard',
    emptyTitle: 'Seu dashboard ainda está vazio',
    emptyDescription:
      'Assim que você criar marcas, produtos e roteiros, os números aparecem aqui.',
  },
  settings: {
    title: 'Configurações',
    profile: 'Perfil',
    theme: 'Tema',
    themeLight: 'Claro',
    themeDark: 'Escuro',
    themeSystem: 'Sistema',
  },
} as const

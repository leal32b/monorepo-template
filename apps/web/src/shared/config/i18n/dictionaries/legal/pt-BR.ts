import type { legalEn } from './en'

export const legalPtBR: typeof legalEn = {
  legal: {
    version: 'Versão de {{date}}',
    terms: {
      title: 'Termos de uso',
      description: 'As regras para usar este serviço.',
      body: [
        'Este texto é provisório. Antes que alguém crie uma conta, substitua-o pelos termos de uso do seu produto, escritos ou revisados por um advogado que conheça os países onde você vende.',
        'Os termos de uso costumam dizer quem presta o serviço e como contatá-lo; quem pode usá-lo e o que são contas e organizações; o que os usuários podem e não podem fazer; quanto custam os planos, como são cobrados, renovados e cancelados, e o que acontece com uma organização que deixa de pagar.',
        'Também dizem de quem são os dados que os usuários incluem e como levam uma cópia (um proprietário os exporta pelas configurações da organização); como se exclui uma conta ou uma organização; o que o serviço promete sobre disponibilidade, e os limites da sua responsabilidade.',
        'Por fim, dizem como estes termos mudam, como os usuários são avisados antes que uma mudança passe a valer, e qual lei e foro se aplicam.'
      ].join('\n\n')
    },
    privacy: {
      title: 'Aviso de privacidade',
      description: 'O que fazemos com os seus dados pessoais.',
      body: [
        'Este texto é provisório. Antes que alguém crie uma conta, substitua-o pelo aviso de privacidade do seu produto, escrito ou revisado por um advogado que conheça as leis de proteção de dados dos países onde você vende (a LGPD no Brasil, o GDPR na Europa).',
        'Um aviso de privacidade costuma nomear o controlador e como falar com o encarregado de dados; os dados pessoais coletados (nome, e-mail, os registros que uma organização guarda sobre os próprios clientes) e para quê; a base legal de cada uso, e as empresas que tratam dados em seu nome, como hospedagem, e-mail e pagamentos.',
        'Também diz por quanto tempo cada tipo de dado é guardado, como é protegido e se sai do país.',
        'Por fim, lista os direitos de cada pessoa e como exercê-los: ver e copiar os seus dados, corrigi-los, levá-los para outro lugar e excluir a conta, o que qualquer pessoa pode fazer pelo perfil.'
      ].join('\n\n')
    }
  }
}

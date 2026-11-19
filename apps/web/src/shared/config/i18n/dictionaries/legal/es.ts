import type { legalEn } from './en'

export const legalEs: typeof legalEn = {
  legal: {
    version: 'Versión del {{date}}',
    terms: {
      title: 'Términos de uso',
      description: 'Las reglas para usar este servicio.',
      body: [
        'Este texto es provisional. Antes de que alguien cree una cuenta, reemplázalo por los términos de uso de tu producto, escritos o revisados por un abogado que conozca los países donde vendes.',
        'Los términos de uso suelen decir quién presta el servicio y cómo contactarlo; quién puede usarlo y qué son las cuentas y las organizaciones; qué pueden y qué no pueden hacer los usuarios; cuánto cuestan los planes, cómo se cobran, renuevan y cancelan, y qué pasa con una organización que deja de pagar.',
        'También dicen de quién son los datos que los usuarios cargan y cómo se llevan una copia (un propietario los exporta desde la configuración de la organización); cómo se elimina una cuenta o una organización; qué promete el servicio sobre su disponibilidad y los límites de su responsabilidad.',
        'Por último, dicen cómo cambian estos términos, cómo se avisa a los usuarios antes de que un cambio entre en vigor, y qué ley y tribunales se aplican.'
      ].join('\n\n')
    },
    privacy: {
      title: 'Aviso de privacidad',
      description: 'Qué hacemos con tus datos personales.',
      body: [
        'Este texto es provisional. Antes de que alguien cree una cuenta, reemplázalo por el aviso de privacidad de tu producto, escrito o revisado por un abogado que conozca las leyes de protección de datos de los países donde vendes (la LGPD en Brasil, el RGPD en Europa).',
        'Un aviso de privacidad suele nombrar al responsable y cómo contactar a su encargado de protección de datos; los datos personales que se recogen (nombre, correo, los registros que una organización guarda de sus propios clientes) y para qué; la base legal de cada uso, y las empresas que tratan datos por su cuenta, como el alojamiento, el correo y los pagos.',
        'También dice cuánto tiempo se guarda cada tipo de dato, cómo se protege y si sale del país.',
        'Por último, enumera los derechos de cada persona y cómo ejercerlos: ver y copiar sus datos, corregirlos, llevarlos a otro lugar y eliminar su cuenta, lo que cualquiera puede hacer desde su perfil.'
      ].join('\n\n')
    }
  }
}

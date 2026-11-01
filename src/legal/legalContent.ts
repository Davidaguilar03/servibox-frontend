import { SUPPORT_EMAIL } from '../config/contact'

// Texto vigente de la politica y de los terminos. La copia de cada version esta en docs/legal y
// no se edita; como publicar una version nueva: docs/DEPLOYMENT.md.

/** Version vigente, AAAA-MM-DD. Debe ser igual a REGISTRATION_POLICY_VERSION del backend. */
export const POLICY_VERSION = '2026-11-01'

export const PRIVACY_POLICY_PATH = '/politica-de-datos'
export const TERMS_PATH = '/terminos'
export const SITE_URL = 'https://servibox.co'

export interface LegalSection {
  title: string
  body: string
}

export interface LegalDocument {
  title: string
  version: string
  sections: LegalSection[]
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Política de tratamiento de datos personales',
  version: `Versión ${POLICY_VERSION}, vigente desde el 1 de noviembre de 2026`,
  sections: [
    {
      title: '1. Responsable del tratamiento',
      body: `ServiBox, a cargo de David Aguilar Castillo. Domicilio: Tunja, Boyacá, Colombia. Correo de contacto: ${SUPPORT_EMAIL}. Sitio web: ${SITE_URL}.`,
    },
    {
      title: '2. Marco legal',
      body: 'Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (incorporado en el Decreto 1074 de 2015) y las demás normas colombianas sobre protección de datos personales.',
    },
    {
      title: '3. Datos que recolectamos',
      body: 'Cuando solicitas el registro de tu serviteca, te pedimos los datos que diligencias en el formulario: nombre comercial, NIT, teléfono y código de tu serviteca, y nombre completo y correo del administrador. No solicitamos datos sensibles ni datos de niños, niñas o adolescentes. Cuando activas tu cuenta, defines un nombre de usuario y una contraseña. También registramos la fecha y la versión de la política que aceptas.',
    },
    {
      title: '4. Finalidades',
      body: 'Usamos tus datos para: evaluar y gestionar tu solicitud de registro; contactarte sobre el estado de la solicitud; crear y activar tu cuenta; enviarte comunicaciones propias del servicio, como el enlace de activación y avisos de seguridad; mantener la seguridad de la plataforma y prevenir usos abusivos; y cumplir obligaciones legales.',
    },
    {
      title: '5. Tus derechos',
      body: 'Como titular de los datos puedes: conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización otorgada; ser informado del uso que se ha dado a tus datos; presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley; revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios, derechos y garantías legales; y acceder de forma gratuita a tus datos personales.',
    },
    {
      title: '6. Cómo ejercer tus derechos',
      body: `Escribe a ${SUPPORT_EMAIL} indicando tu nombre y lo que solicitas. Atendemos las consultas en máximo diez días hábiles, prorrogables por cinco días hábiles más, y los reclamos en máximo quince días hábiles, prorrogables por ocho días hábiles más, conforme a la ley. Solo puedes acudir a la Superintendencia de Industria y Comercio después de haber agotado este trámite.`,
    },
    {
      title: '7. Autorización',
      body: 'Al marcar la casilla de aceptación en el formulario, nos otorgas una autorización previa, expresa e informada para tratar tus datos conforme a esta política. Puedes revocarla en cualquier momento, salvo cuando exista un deber legal o contractual de conservar los datos.',
    },
    {
      title: '8. Proveedores que tratan datos por nuestra cuenta',
      body: 'Para operar el servicio usamos proveedores de alojamiento y de envío de correo electrónico, por ejemplo DigitalOcean y Resend, ubicados fuera de Colombia, incluidos Estados Unidos. Estos proveedores tratan los datos únicamente por cuenta de ServiBox y bajo medidas de seguridad. No vendemos tus datos.',
    },
    {
      title: '9. Seguridad',
      body: 'Aplicamos medidas técnicas y organizativas razonables, como conexiones cifradas mediante HTTPS y control de accesos, para proteger tus datos frente a acceso no autorizado, pérdida o alteración.',
    },
    {
      title: '10. Conservación',
      body: 'Conservamos tus datos mientras gestionamos tu solicitud y durante la relación con ServiBox, y después por el tiempo necesario para cumplir obligaciones legales. Puedes solicitar su supresión conforme a la sección 6.',
    },
    {
      title: '11. Datos de las servitecas y de sus clientes',
      body: 'Una vez activa tu cuenta, tu serviteca es la responsable de los datos personales de sus propios clientes que registre en la plataforma, y ServiBox los trata como encargado, por cuenta de tu serviteca y solo para prestar el servicio.',
    },
    {
      title: '12. Cambios en esta política',
      body: 'Si la modificamos, publicaremos una nueva versión con su fecha. Tu solicitud queda asociada a la versión que aceptaste.',
    },
  ],
}

export const TERMS: LegalDocument = {
  title: 'Términos y condiciones',
  version: `Versión ${POLICY_VERSION}, vigentes desde el 1 de noviembre de 2026`,
  sections: [
    {
      title: '1. Qué es ServiBox',
      body: 'ServiBox es una plataforma web para administrar servitecas. Estos términos regulan el uso de la plataforma por parte de las servitecas y de las personas que ellas autorizan.',
    },
    {
      title: '2. Solicitud de registro',
      body: 'Solicitar el registro no garantiza que sea aprobado. ServiBox puede aprobar o rechazar solicitudes. La información que entregas debe ser veraz y estar actualizada.',
    },
    {
      title: '3. Cuenta y credenciales',
      body: `Eres responsable de custodiar tus credenciales y las de los usuarios que autorices en tu serviteca, y de lo que se haga con ellas. Avísanos de inmediato a ${SUPPORT_EMAIL} si sospechas un uso no autorizado.`,
    },
    {
      title: '4. Uso aceptable',
      body: 'No puedes usar la plataforma para actividades ilícitas, intentar vulnerar su seguridad, acceder a datos de otras servitecas, ni hacer un uso abusivo que afecte a otros usuarios o al servicio.',
    },
    {
      title: '5. Tus datos',
      body: 'La información que registres en tu serviteca es tuya. ServiBox la trata como encargado para prestar el servicio, de acuerdo con la Política de tratamiento de datos personales.',
    },
    {
      title: '6. Disponibilidad y respaldos',
      body: 'El servicio se encuentra en una etapa inicial y no se garantiza una disponibilidad ininterrumpida. Podemos realizar mantenimientos y cambios. Realizamos respaldos periódicos, pero no garantizamos la ausencia de pérdida de datos.',
    },
    {
      title: '7. Suspensión y terminación',
      body: `ServiBox puede suspender o terminar el acceso de una serviteca por incumplimiento de estos términos, uso indebido o riesgo para la seguridad. También puedes pedir en cualquier momento la terminación de tu cuenta escribiendo a ${SUPPORT_EMAIL}.`,
    },
    {
      title: '8. Obligaciones de cada serviteca',
      body: 'Cada serviteca es responsable del cumplimiento de sus propias obligaciones legales, tributarias y comerciales, y de la información que registra.',
    },
    {
      title: '9. Propiedad intelectual',
      body: 'El software, la marca y el contenido de ServiBox son de sus titulares. Te otorgamos una licencia limitada, no exclusiva e intransferible para usar la plataforma mientras tu cuenta esté activa.',
    },
    {
      title: '10. Limitación de responsabilidad',
      body: 'En la medida permitida por la ley colombiana, ServiBox se presta en el estado en que se encuentra y no responde por daños indirectos, lucro cesante ni pérdida de datos derivados del uso o de la imposibilidad de uso del servicio.',
    },
    {
      title: '11. Cambios en estos términos',
      body: 'Si los modificamos, publicaremos una nueva versión con su fecha. El uso continuado después del cambio implica su aceptación.',
    },
    {
      title: '12. Ley aplicable',
      body: `Estos términos se rigen por las leyes de Colombia. Para cualquier consulta escribe a ${SUPPORT_EMAIL}.`,
    },
  ],
}

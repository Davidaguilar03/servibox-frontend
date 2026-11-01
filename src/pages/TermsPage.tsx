import { GLOSSARY } from '../copy/glossary'
import { LegalPage } from '../legal/LegalPage'
import { PRIVACY_POLICY_PATH, TERMS } from '../legal/legalContent'
import { usePageMeta } from '../lib/usePageMeta'

export function TermsPage() {
  usePageMeta('Términos | ServiBox', 'Términos y condiciones de uso de ServiBox.')

  return <LegalPage document={TERMS} other={{ to: PRIVACY_POLICY_PATH, label: GLOSSARY.privacyPolicyShort }} />
}

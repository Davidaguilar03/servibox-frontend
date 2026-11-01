import { GLOSSARY } from '../copy/glossary'
import { LegalPage } from '../legal/LegalPage'
import { PRIVACY_POLICY, TERMS_PATH } from '../legal/legalContent'
import { usePageMeta } from '../lib/usePageMeta'

export function PrivacyPolicyPage() {
  usePageMeta('Política de datos | ServiBox', 'Cómo ServiBox trata los datos personales de quienes solicitan una cuenta.')

  return <LegalPage document={PRIVACY_POLICY} other={{ to: TERMS_PATH, label: GLOSSARY.terms }} />
}

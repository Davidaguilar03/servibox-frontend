import { Link } from 'react-router'
import { GLOSSARY } from '../copy/glossary'
import { PRIVACY_POLICY_PATH, TERMS_PATH } from './legalContent'

const linkClass = 'inline-flex min-h-touch items-center rounded-control underline focus-ring'

/** Enlaces legales del pie de login, registro y activacion. */
export function LegalLinks() {
  return (
    <div className="flex flex-wrap justify-end gap-x-4">
      <Link to={PRIVACY_POLICY_PATH} className={linkClass}>{GLOSSARY.privacyPolicyShort}</Link>
      <Link to={TERMS_PATH} className={linkClass}>{GLOSSARY.terms}</Link>
    </div>
  )
}

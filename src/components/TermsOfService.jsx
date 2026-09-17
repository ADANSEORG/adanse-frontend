import LegalPage from "./LegalPage.jsx";
import content from "../legal/terms-of-service.md?raw";

export default function TermsOfService() {
  return <LegalPage content={content} />;
}

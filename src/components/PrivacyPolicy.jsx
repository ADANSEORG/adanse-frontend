import LegalPage from "./LegalPage.jsx";
import content from "../legal/privacy-policy.md?raw";

export default function PrivacyPolicy() {
  return <LegalPage content={content} />;
}

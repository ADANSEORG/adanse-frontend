/*
 * The notice shown where a researcher chooses which open-ended answers to
 * analyse. That choice is what sends respondents' free text to third-party AI
 * providers, so it is where they should be told.
 *
 * DRAFT WORDING -- to be reviewed together with the Privacy Policy / Terms
 * update (see the draft in the backend repo, docs/legal/). Kept in one place so
 * the reviewed text can be dropped in without touching the component.
 *
 * Deliberately true whatever else ships: it says names and other details typed
 * inside an answer are sent as written. It does not claim anything is masked or
 * removed automatically.
 */

export const AI_PROVIDERS = ["Groq", "Cerebras"];

export const QUALITATIVE_AI_NOTICE = {
  heading: "Your respondents' answers are processed by AI providers",
  paragraphs: [
    `To find codes and themes, Adanse sends the text of the open-ended answers you select here, together with your research objectives, to third-party AI providers (${AI_PROVIDERS.join(" and ")}). Other columns of your dataset are not sent.`,
    "Anything typed inside an answer — a name, a phone number, a workplace — is sent as written.",
    "Before you continue, make sure your respondents were told their answers may be analysed this way, and remove any personal details you do not want shared.",
  ],
};

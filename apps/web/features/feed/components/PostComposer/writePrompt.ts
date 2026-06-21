export const POST_COMPOSER_WRITE_PROMPTS = [
  "What’s on screen, {name}?",
  "Action, {name}.",
  "What are you watching, {name}?",
  "Talk film, {name}.",
] as const;

function promptIndexForName(name: string) {
  var hash = 0;
  for (var i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % POST_COMPOSER_WRITE_PROMPTS.length;
}

export function postComposerWritePrompt(name: string) {
  var displayName = name.trim() || "Profile";
  var prompt = POST_COMPOSER_WRITE_PROMPTS[promptIndexForName(displayName)] ?? POST_COMPOSER_WRITE_PROMPTS[0];
  return prompt.replace("{name}", displayName);
}

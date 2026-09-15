// Audio completely removed per user request
class SilentEffects {
  playSuccess() {}
  playWarning() {}
  playError() {}
}

export const sounds = new SilentEffects();

export function playSound(_type?: string) {}

export class LocaleUtils {
  static getMessage(
    messageName: string,
    sub?: string | (string | number)[],
  ): string {
    return chrome.i18n.getMessage(messageName, sub);
  }
}

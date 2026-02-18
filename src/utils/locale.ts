export class LocaleUtils {
  static getMessage(messageName: string, sub?: string | string[]): string {
    return browser.i18n.getMessage(messageName, sub)
  }
}

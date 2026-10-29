import i18n, { LANGS } from "..";
import { LANG_OPTIONS } from "../../features/profile/constants/profile.constants";

describe.each([
  ["id", "Beranda", "Bahasa Indonesia"],
  ["ru", "Главная", "Русский"],
  ["tr", "Ana sayfa", "Türkçe"],
])("%s language bundles", (language, home, label) => {
  it("loads navigation, wizard, profile and sharing without an English fallback", async () => {
    await i18n.changeLanguage(language);
    expect(LANGS).toContain(language);
    expect(LANG_OPTIONS).toContainEqual(expect.objectContaining({ code: language, label }));
    expect(i18n.t("navigation.tabs.Home")).toBe(home);
    for (const key of [
      "createPlant.common.next",
      "createPlant.step01.title",
      "createPlant.step04.modal.headingLive",
      "profile.settings.language",
      "sharing.form.manageTitle",
      "sharing.plants.displayTasks",
    ]) {
      const local = i18n.getResource(language, "translation", key);
      expect(typeof local).toBe("string");
      expect(local).not.toBe(i18n.getResource("en", "translation", key));
      expect(i18n.t(key)).toBe(local);
    }
    const actions = i18n.t("sharing.plants.actions", { name: "Blueberry" });
    expect(actions).toContain("Blueberry");
    expect(actions).not.toContain("{{");
  });
});

afterAll(async () => { await i18n.changeLanguage("en"); });

import {App, PluginSettingTab, Setting} from "obsidian";
import SmoothObsidianPlugin from "./main";

export interface SmoothObsidianSettings {
	speed: number;
	easing: string;
	enableSplashScreen: boolean;
	animateNoteOpen: boolean;
	enableHeaderAnimations: boolean;
	enableFormattingAnimations: boolean;
	enableModalAnimations: boolean;
}

export const DEFAULT_SETTINGS: SmoothObsidianSettings = {
	speed: 0.4,
	easing: "cubic-bezier(0.16, 1, 0.3, 1)",
	enableSplashScreen: true,
	animateNoteOpen: true,
	enableHeaderAnimations: true,
	enableFormattingAnimations: true,
	enableModalAnimations: true,
}

export class SmoothObsidianSettingTab extends PluginSettingTab {
	plugin: SmoothObsidianPlugin;

	constructor(app: App, plugin: SmoothObsidianPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Smooth Obsidian" });
		containerEl.createEl("p", {
			text: "Dostosuj prędkość, dynamikę oraz poszczególne efekty animacji w swojej aplikacji.",
			cls: "setting-item-description"
		});

		containerEl.createEl("h3", { text: "Główne Ustawienia" });

		new Setting(containerEl)
			.setName("Prędkość Animacji (Speed)")
			.setDesc("Określa czas trwania animacji w sekundach. Mniejsze wartości dają szybszy efekt, większe wolniejszy.")
			.addSlider(slider => slider
				.setLimits(0.1, 2.0, 0.05)
				.setValue(this.plugin.settings.speed)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.speed = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Krzywa Przejścia (Easing)")
			.setDesc("Wybierz rodzaj dynamiki przyspieszania animacji.")
			.addDropdown(dropdown => dropdown
				.addOption("cubic-bezier(0.16, 1, 0.3, 1)", "Ease Out Expo (Nowoczesny & Dynamiczny)")
				.addOption("cubic-bezier(0.34, 1.56, 0.64, 1)", "Elastic (Efekt sprężystości/pop)")
				.addOption("cubic-bezier(0.4, 0, 0.2, 1)", "Material Design (Zbalansowany)")
				.addOption("ease-in-out", "Ease In Out (Tradycyjny płynny)")
				.addOption("linear", "Linear (Liniowy/stały)")
				.setValue(this.plugin.settings.easing)
				.onChange(async (value) => {
					this.plugin.settings.easing = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		containerEl.createEl("h3", { text: "Włączane Efekty" });

		new Setting(containerEl)
			.setName("Animacja otwierania notatek")
			.setDesc("Płynne wygaszanie (fade-in) i wsuwanie notatki przy przełączaniu lub otwieraniu plików.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.animateNoteOpen)
				.onChange(async (value) => {
					this.plugin.settings.animateNoteOpen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Animacja startowa (Splash Screen)")
			.setDesc("Płynny start aplikacji przy otwieraniu vaulta (efekt odsłaniania workspace).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSplashScreen)
				.onChange(async (value) => {
					this.plugin.settings.enableSplashScreen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Pop-up nagłówków w edytorze")
			.setDesc("Lekkie przesunięcie i wyskakujący prefiks nagłówka (#) podczas edycji aktywnej linii.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHeaderAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableHeaderAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Animacja formatowania inline")
			.setDesc("Delikatne, płynne wysunięcie poziomów dla pogrubień, kursywy oraz inline code podczas pisania.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFormattingAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableFormattingAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Animacje okien modalnych / ustawień")
			.setDesc("Dynamiczne wsuwanie i skalowanie okien dialogowych, ustawień i menu.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableModalAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableModalAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);
	}
}

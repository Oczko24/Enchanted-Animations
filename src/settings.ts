import { App, PluginSettingTab, Setting } from "obsidian";
import EnchantedAnimationsPlugin from "./main";

export interface EnchantedAnimationsSettings {
	speed: number;
	easing: string;
	enableSplashScreen: boolean;
	animateNoteOpen: boolean;
	enableHeaderAnimations: boolean;
	enableFormattingAnimations: boolean;
	enableModalAnimations: boolean;
	enableNativeAnimations: boolean;
	enableSmoothScroll: boolean;
	enableGpuAcceleration: boolean;
}

export const DEFAULT_SETTINGS: EnchantedAnimationsSettings = {
	speed: 0.4,
	easing: "cubic-bezier(0.16, 1, 0.3, 1)",
	enableSplashScreen: true,
	animateNoteOpen: true,
	enableHeaderAnimations: true,
	enableFormattingAnimations: true,
	enableModalAnimations: true,
	enableNativeAnimations: true,
	enableSmoothScroll: true,
	enableGpuAcceleration: true,
}

export class EnchantedAnimationsSettingTab extends PluginSettingTab {
	plugin: EnchantedAnimationsPlugin;

	constructor(app: App, plugin: EnchantedAnimationsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Enchanted Animations" });
		containerEl.createEl("p", {
			text: "Customize the speed, easing, and individual effects of your Obsidian animations.",
			cls: "setting-item-description"
		});

		containerEl.createEl("h3", { text: "Core Properties" });

		new Setting(containerEl)
			.setName("Animation Slowness")
			.setDesc("Set the duration of animations in seconds. Lower is faster, higher is slower.")
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
			.setName("Easing Curve")
			.setDesc("Choose the acceleration curve for all animations.")
			.addDropdown(dropdown => dropdown
				.addOption("cubic-bezier(0.16, 1, 0.3, 1)", "Ease Out Expo (Sleek & Fast)")
				.addOption("cubic-bezier(0.34, 1.56, 0.64, 1)", "Elastic (Playful Pop)")
				.addOption("cubic-bezier(0.4, 0, 0.2, 1)", "Material Design (Balanced)")
				.addOption("ease-in-out", "Ease In Out (Traditional)")
				.addOption("linear", "Linear (Constant)")
				.setValue(this.plugin.settings.easing)
				.onChange(async (value) => {
					this.plugin.settings.easing = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		containerEl.createEl("h3", { text: "Animation Toggles" });

		new Setting(containerEl)
			.setName("Animate Note Opening")
			.setDesc("Smooth fade-in and slide-up effect when opening or switching files.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.animateNoteOpen)
				.onChange(async (value) => {
					this.plugin.settings.animateNoteOpen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Startup Splash Screen")
			.setDesc("Smooth workspace reveal animation upon vault launch.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSplashScreen)
				.onChange(async (value) => {
					this.plugin.settings.enableSplashScreen = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Editor Header Pop")
			.setDesc("Slight horizontal shift and animated (#) prefixes on active header lines.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHeaderAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableHeaderAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Inline Formatting Push")
			.setDesc("Smooth horizontal expansion for bold, italics, and inline code while typing.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFormattingAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableFormattingAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Modal & Settings Animations")
			.setDesc("Dynamic scale and slide for dialogs, settings, and menus. Includes exit animations.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableModalAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableModalAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("Native UI Animations")
			.setDesc("Override default Obsidian UI transitions (sidebars, tabs, ribbons) to use the custom speed and easing.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableNativeAnimations)
				.onChange(async (value) => {
					this.plugin.settings.enableNativeAnimations = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		containerEl.createEl("h3", { text: "Performance" });

		new Setting(containerEl)
			.setName("Smooth Scroll")
			.setDesc("Enable CSS smooth scrolling across all scrollable containers in the app.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSmoothScroll)
				.onChange(async (value) => {
					this.plugin.settings.enableSmoothScroll = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		new Setting(containerEl)
			.setName("GPU Acceleration")
			.setDesc("Force hardware compositing on modals, menus, and animated elements to reduce rendering lag.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableGpuAcceleration)
				.onChange(async (value) => {
					this.plugin.settings.enableGpuAcceleration = value;
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
				})
			);

		containerEl.createEl("h3", { text: "System" });

		new Setting(containerEl)
			.setName("Reset Settings")
			.setDesc("Restore all animation values and toggles to their default states.")
			.addButton(button => button
				.setButtonText("Reset to Defaults")
				.setWarning()
				.onClick(async () => {
					this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
					await this.plugin.saveSettings();
					this.plugin.applyStyles();
					this.display();
				})
			);
	}
}

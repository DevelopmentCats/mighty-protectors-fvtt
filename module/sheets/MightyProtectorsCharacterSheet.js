import MPItem from "../mpitem.js";
import { MP } from "../config.js";

const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * ActorSheetV2 implementation for Mighty Protectors characters, NPCs, and vehicles.
 * @extends {foundry.applications.sheets.ActorSheetV2}
 */
export default class MightyProtectorsCharacterSheet extends foundry.applications.sheets.ActorSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ["mightyprotectors", "sheet", "character"],
        position: {
            width: 600,
            height: 700
        },
        form: {
            submitOnChange: true
        },
        window: {
            resizable: true
        }
    };

    static PARTS = {
        sheet: {
            template: "systems/mighty-protectors/templates/sheets/MightyProtectorsCharacter-sheet.hbs"
        },
        vehicle: {
            template: "systems/mighty-protectors/templates/sheets/vehicle-sheet.hbs"
        }
    };

    static TABS = {
        sheet: {
            stats: { id: "stats", group: "sheet", label: "MP.Stats" },
            bio:   { id: "bio",   group: "sheet", label: "MP.Bio" },
            story: { id: "story", group: "sheet", label: "MP.Story" }
        }
    };

    /** @override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        // Only render the part appropriate to the actor type
        if (this.actor.type === "vehicle") {
            options.parts = ["vehicle"];
        } else {
            options.parts = ["sheet"];
        }
    }

    /** @override */
    tabGroups = {
        sheet: "stats"
    };

    /** @override */
    async _prepareContext(options) {
        const context = {
            // Standard actor sheet data
            actor: this.actor,
            system: this.actor.system,
            source: this.actor.system._source,
            items: Array.from(this.actor.items),
            editable: this.isEditable,
            owner: this.actor.isOwner,
            limited: this.actor.limited,
            options: this.options,
            cssClass: this.actor.isOwner ? "editable" : "locked",

            // Enriched content
            enrichedStory: await TextEditor.enrichHTML(this.actor.system.story ?? ""),

            // Type label
            typeAbbr: this._getTypeAbbr(),

            // Tabs
            tabs: this._getTabs()
        };

        // Prepare categorized item lists
        this._prepareItems(context);

        return context;
    }

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        if (!this.isEditable) return;

        const html = this.element;

        // Bind event listeners using event delegation (preserving original template selectors)
        html.querySelectorAll('.saveroll').forEach(el => {
            el.addEventListener('click', this._onRollSave.bind(this));
        });

        html.querySelectorAll('.item-create').forEach(el => {
            el.addEventListener('click', this._onItemCreate.bind(this));
        });

        html.querySelectorAll('.item-edit').forEach(el => {
            el.addEventListener('click', this._onItemEdit.bind(this));
        });

        html.querySelectorAll('.item-delete').forEach(el => {
            el.addEventListener('click', this._onItemDelete.bind(this));
        });

        html.querySelectorAll('.item-info').forEach(el => {
            el.addEventListener('click', this._onItemInfo.bind(this));
        });

        html.querySelectorAll('.item-chat').forEach(el => {
            el.addEventListener('click', this._onItemChat.bind(this));
        });

        html.querySelectorAll('.item-usecharge').forEach(el => {
            el.addEventListener('click', this._onItemUseCharge.bind(this));
        });

        html.querySelectorAll('.item-resetcharges').forEach(el => {
            el.addEventListener('click', this._onItemResetCharges.bind(this));
        });

        html.querySelectorAll('.attackroll').forEach(el => {
            el.addEventListener('click', this._onRollAttack.bind(this));
        });

        html.querySelectorAll('.initroll').forEach(el => {
            el.addEventListener('click', this._onRollInitiative.bind(this));
        });

        html.querySelectorAll('.genericroll').forEach(el => {
            el.addEventListener('click', this._onRollGeneric.bind(this));
        });

        html.querySelectorAll('.timed-rest').forEach(el => {
            el.addEventListener('click', this._onRest.bind(this));
        });

        html.querySelectorAll('.dmg-edit').forEach(el => {
            el.addEventListener('change', this._onDamageEdit.bind(this));
        });

        html.querySelectorAll('.item-useindpower').forEach(el => {
            el.addEventListener('click', this._onItemUseIndPower.bind(this));
        });

        html.querySelectorAll('.item-resetindpower').forEach(el => {
            el.addEventListener('click', this._onItemResetIndPower.bind(this));
        });
    }

    /**
     * Get localized type abbreviation
     * @returns {string}
     */
    _getTypeAbbr() {
        switch (this.actor.type) {
            case "npc":
                return game.i18n.localize("ACTOR.TypeNpc");
            case "vehicle":
                return game.i18n.localize("ACTOR.TypeVehicle");
            default:
                return game.i18n.localize("ACTOR.TypeCharacter");
        }
    }

    /**
     * Prepare tab data for the template
     * @returns {object}
     */
    _getTabs() {
        const tabs = {};
        for (const [groupId, group] of Object.entries(MightyProtectorsCharacterSheet.TABS)) {
            tabs[groupId] = {};
            for (const [tabId, tab] of Object.entries(group)) {
                tabs[groupId][tabId] = {
                    ...tab,
                    active: this.tabGroups[groupId] === tabId,
                    cssClass: this.tabGroups[groupId] === tabId ? "active" : ""
                };
            }
        }
        return tabs;
    }

    /**
     * Organize items into categorized arrays for the template
     * @param {object} context - The render context
     */
    _prepareItems(context) {
        const abilities = [];
        const attacks = [];
        const protections = [];
        const movements = [];
        const backgrounds = [];
        const vehiclesystems = [];
        const vehicleattacks = [];

        for (const item of context.items) {
            // Ensure default image
            item.img = item.img || "icons/svg/mystery-man.svg";

            switch (item.type) {
                case "ability":
                    abilities.push(item);
                    break;
                case "attack":
                    attacks.push(item);
                    break;
                case "protection":
                    protections.push(item);
                    break;
                case "movement":
                    movements.push(item);
                    break;
                case "background":
                    backgrounds.push(item);
                    break;
                case "vehiclesystem":
                    vehiclesystems.push(item);
                    break;
                case "vehicleattack":
                    vehicleattacks.push(item);
                    break;
            }
        }

        context.abilities = abilities;
        context.attacks = attacks;
        context.protections = protections;
        context.movements = movements;
        context.backgrounds = backgrounds;
        context.vehiclesystems = vehiclesystems;
        context.vehicleattacks = vehicleattacks;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers (instance methods bound in _onRender)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Roll a saving throw
     * @param {Event} event
     */
    async _onRollSave(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;
        await this.actor.rollSave(dataset);
    }

    /**
     * Add an item directly to a character sheet
     * @param {Event} event
     */
    async _onItemCreate(event) {
        event.preventDefault();
        const element = event.currentTarget;
        let itemName = '';

        switch (element.dataset.type) {
            case 'ability':
                itemName = game.i18n.localize("MP.NewAbility");
                break;
            case 'attack':
                itemName = game.i18n.localize("MP.NewAttack");
                break;
            case 'movement':
                itemName = game.i18n.localize("MP.NewMovement");
                break;
            case 'protection':
                itemName = game.i18n.localize("MP.NewProtection");
                break;
            case 'background':
                itemName = game.i18n.localize("MP.NewBackground");
                break;
            case 'vehiclesystem':
                itemName = game.i18n.localize("MP.NewVehSystem");
                break;
            case 'vehicleattack':
                itemName = game.i18n.localize("MP.NewVehAttack");
                break;
            default:
                ui.notifications.warn('Add item with no item type defined');
                return;
        }

        const itemData = [{
            name: itemName,
            type: element.dataset.type,
            img: MP.ItemTypeImages[element.dataset.type]
        }];

        return await MPItem.create(itemData, { parent: this.actor });
    }

    /**
     * Open item edit form from the character sheet
     * @param {Event} event
     */
    async _onItemEdit(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) item.sheet.render(true);
    }

    /**
     * Delete an item from the character sheet
     * @param {Event} event
     */
    async _onItemDelete(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.delete();
    }

    /**
     * Show "rules" value of an item in the chat
     * @param {Event} event
     */
    _onItemInfo(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        let cardContent = '';

        switch (element.dataset.type) {
            case 'ability':
                cardContent = "<h3>" + item.name + "</h3><div>" + item.system.rules + "</div>";
                break;
            default:
                cardContent = "";
                break;
        }

        if (cardContent) {
            ChatMessage.create({
                content: cardContent,
                speaker: ChatMessage.getSpeaker({ actor: this.actor })
            });
        }
    }

    /**
     * Post the item description to chat
     * @param {Event} event
     */
    _onItemChat(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        let cardContent = '';

        switch (element.dataset.type) {
            case 'ability':
                cardContent = "<h3>" + item.name + "</h3><div>" + item.system.description + "</div>";
                break;
            default:
                cardContent = "";
                break;
        }

        if (cardContent) {
            ChatMessage.create({
                content: cardContent,
                speaker: ChatMessage.getSpeaker({ actor: this.actor })
            });
        }
    }

    /**
     * Decrement the remaining charges on an ability that uses charges
     * @param {Event} event
     */
    async _onItemUseCharge(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        const itemData = item.system;

        let used = itemData.chargesused;
        if (used > 0) { used = used - 1; }
        return item.update({ 'system.chargesused': used });
    }

    /**
     * Reset charges on an item to full
     * @param {Event} event
     */
    async _onItemResetCharges(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        return item.update({ 'system.chargesused': item.system.charges });
    }

    /**
     * Use independent power
     * @param {Event} event
     */
    async _onItemUseIndPower(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        const itemData = item.system;

        let used = itemData.powervalue;
        if (used > 0) { used = used - 1; }
        return item.update({ 'system.powervalue': used });
    }

    /**
     * Reset independent power to full
     * @param {Event} event
     */
    async _onItemResetIndPower(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        return item.update({ 'system.powervalue': item.system.powermax });
    }

    /**
     * Roll an attack
     * @param {Event} event
     */
    async _onRollAttack(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) item.rollAttack();
    }

    /**
     * Roll initiative
     * @param {Event} event
     */
    async _onRollInitiative(event) {
        event.preventDefault();
        return await this.actor.rollInitiative({ createCombatants: true });
    }

    /**
     * Roll a generic roll
     * @param {Event} event
     */
    async _onRollGeneric(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;
        await this.actor.rollGeneric(dataset);
    }

    /**
     * Handle the rest dialog
     * @param {Event} event
     */
    async _onRest(event) {
        event.preventDefault();

        const data = {
            config: MP
        };

        const dlgContent = await renderTemplate("systems/mighty-protectors/templates/dialogs/rest.hbs", data);

        const actor = this.actor;
        await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize("MP.Rest") },
            content: dlgContent,
            buttons: [
                {
                    label: game.i18n.localize("MP.RecoverAll"),
                    icon: "fa-solid fa-first-aid",
                    action: "recoverAll",
                    default: true,
                    callback: async (event, button, dialog) => {
                        return await actor.recoverAll();
                    }
                },
                {
                    label: game.i18n.localize("MP.TimedRest"),
                    icon: "fa-solid fa-bed",
                    action: "timedRest",
                    callback: async (event, button, dialog) => {
                        const healtime = button.form.elements.healtime?.value?.trim() ?? "0";
                        const timeframe = button.form.elements.timeframe?.value?.trim() ?? "";
                        return await actor.timedRecovery(timeframe, healtime);
                    }
                },
                {
                    label: game.i18n.localize("MP.Cancel"),
                    icon: "fa-solid fa-times",
                    action: "cancel"
                }
            ]
        });
    }

    /**
     * Handle damage edit input change
     * @param {Event} event
     */
    async _onDamageEdit(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const itemId = element.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
            return item.update({ 'system.dmg': Number(element.value) });
        }
    }
}

import MPItem from '../mpitem.js';

export default class MightyProtectorsItemSheet extends ItemSheet {
    constructor(...args) {
        super(...args);

        // expand default size for attack item type
        if (this.object.type === 'attack' || this.object.type === 'vehicleattack') {
            this.options.width = this.position.width = 600;
            this.options.height = this.position.height = 420;
        }
        else if (this.object.type === 'vehiclesystem') {
            this.options.height = this.position.height = 420;
        }
    }


    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            height: 350,
            classes: ["mightyprotectors", "sheet", "item"],
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-body", initial: "description" }]
        });
    }

    get template() {
        return `systems/mighty-protectors/templates/sheets/${this.item.type}-sheet.hbs`;
    }

    async getData(options) {
        const baseData = super.getData();
        const isOwned = (baseData.item.actor !== null);
        let sheetData = {
            owner: this.item.isOwner,
            editable: this.isEditable,
            item: baseData.item,
            system: baseData.item.system,
            isowned: isOwned,
            config: CONFIG.MP
        };
        sheetData.itemType = game.i18n.localize(`ITEM.Type${sheetData.item.type.titleCase()}`);
        sheetData.enrichedRules = await TextEditor.enrichHTML(this.item.system.rules);


        if (isOwned) {
            this._prepareItems(sheetData, baseData.item.actor.items);
        }
        return sheetData;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.apply-bonus').click(this._onApplyBonus.bind(this));
        html.find('.remove-bonus').click(this._onRemoveBonus.bind(this));
    }


    _prepareItems(sheetData, items) {
        const appliedabilities = [];
        const availabilities = [];
        const chargesources = [];
        const indpowersources = [];
        const bonusids = sheetData.item.system.bonusids;
        const appliedsystems = [];
        const availsystems = [];

        // iterate through items & allocate to containers
        for (let i of items) {
            if (i.type === 'ability' && i.system.tohitbonus) {
                if (bonusids && bonusids.includes(i.id)) {
                    appliedabilities.push(
                        {
                            id: i.id,
                            name: i.name,
                            bonus: i.system.tohitbonus
                        }
                    );
                }
                else {
                    availabilities.push(
                        {
                            id: i.id,
                            name: i.name,
                            bonus: i.system.tohitbonus
                        }
                    );
                }
            }


            if (i.type === 'vehiclesystem' && i.system.tohitbonus) {
                if (bonusids && bonusids.includes(i.id)) {
                    appliedsystems.push(
                        {
                            id: i.id,
                            name: i.name,
                            bonus: i.system.tohitbonus
                        }
                    );
                }
                else {
                    availsystems.push(
                        {
                            id: i.id,
                            name: i.name,
                            bonus: i.system.tohitbonus
                        }
                    );
                }
            }



            if ((i.type === 'ability' || i.type === 'vehiclesystem') && i.system.usescharges) {
                chargesources.push(
                    {
                        id: i.id,
                        name: i.name
                    }
                );
            }

            if (i.type === 'vehiclesystem' && i.system.indpower) {
                indpowersources.push(
                    {
                        id: i.id,
                        name: i.name
                    }
                );
            }
        }

        sheetData.availabilities = availabilities;
        sheetData.appliedabilities = appliedabilities;
        sheetData.chargesources = chargesources;
        sheetData.indpowersources = indpowersources;
        sheetData.appliedsystems = appliedsystems;
        sheetData.availsystems = availsystems;
    }


    async _onApplyBonus(event) {
        const element = event.currentTarget;
        const dataset = element.dataset;
        const actor = this.item.actor;
        const abilityItem = actor.items.find(i => i.id === dataset.itemid);
        let bonusids = this.item.system.bonusids;
        
        if (!bonusids.includes(dataset.itemid)) {
            bonusids.push(dataset.itemid);

            await this.item.update({ 'system.bonusids': bonusids });
            this.item._prepareDerivedAttackData();
        }

        return;
    }

    async _onRemoveBonus(event) {
        const element = event.currentTarget;
        const dataset = element.dataset;
        const actor = this.item.actor;
        const abilityItem = actor.items.find(i => i.id === dataset.itemid);
        let bonusids = this.item.system.bonusids;
        
        if (bonusids.includes(dataset.itemid)) {
            bonusids = bonusids.filter(function (value, index, arr) {
                return value != dataset.itemid;
            });


            await this.item.update({ 'system.bonusids': bonusids });
            this.item._prepareDerivedAttackData();
        }
        return;
    }
}

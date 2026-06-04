import { MP } from './config.js';
import { rollMinMax, simpleGMWhisper, getCharAblityToHitBonus } from './utility.js';

/**
 * Override and extend the basic Item implementation.
 * @extends {Item}
 */
export default class MPItem extends Item {

    chatTemplate = {
        "attack": "systems/mighty-protectors/templates/chatcards/attackroll.hbs"
    }

    dlgTemplate = {
        "attack": "systems/mighty-protectors/templates/dialogs/attackmods.hbs"
    }


    /**
     * Extends Item._preCreate to add default images by item type
     * @param {*} data 
     * @param {*} options 
     * @param {*} userId 
     */
    async _preCreate(data, options, userId) {
        await super._preCreate(data, options, userId);

        // assign a default image based on item type
        if (!data.img) {
            const img = MP.ItemTypeImages[data.type];
    
            if (img) await this.updateSource({ img: img });
        }
    }

    /**
     * @override
     * Item-level prepareDerivedData - just calls super which triggers TypeDataModel.prepareDerivedData()
     * The actual derived data logic is now in the TypeDataModel classes in item-models.js
     */
    prepareDerivedData() {
        super.prepareDerivedData();
    }

    /**
     * Roll an attack with this item
     */
    async rollAttack() {
        const actor = this.actor;
        const itemName = this.name;
        let itemData = this.system;
        let target = null;
        let targetName = "";
        let defense = 0;
        let autoPowerSetting = game.settings.get(game.system.id, "autoDecrementPowerOnAttack");
        let autoChargesSetting = game.settings.get(game.system.id, "autoDecrementChargesOnAttack");
        let checkPower = game.settings.get(game.system.id, "checkPowerOnAttack");
        let showCanRollWithChar = game.settings.get(game.system.id, "showCanRollWithChar");
        let showCanRollWithNPC = game.settings.get(game.system.id, "showCanRollWithNPC");
        

        // get target info if selected
        if (game.user.targets.size > 0) {
            target = Array.from(game.user.targets)[0];
            targetName = target.name;
            if (itemData.dmgtype == "DAMAGE.Psychic") {
                defense = target.actor.system.mentaldefense;
            }
            else {
                if (target.actor.type === 'vehicle') {
                    defense = target.actor.system.defense;
                }
                else
                {
                    defense = target.actor.system.physicaldefense;
                }
            }
        }

        let dlgData = {
            targetName: targetName,
            showDeductPower: autoPowerSetting === "choose",
            showDeductCharges: autoChargesSetting === "choose"
        };

        let dlgContent = await foundry.applications.handlebars.renderTemplate("systems/mighty-protectors/templates/dialogs/attackmods.hbs", dlgData);

        await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize("ITEM.TypeAttack") + ": " + itemName },
            content: dlgContent,
            buttons: [
                {
                    label: game.i18n.localize("MP.Roll"),
                    icon: "fa-solid fa-dice-d20",
                    action: "rollAttack",
                    default: true,
                    callback: async (event, button, dialog) => {
                        const html = button.form;
                        await rollAttackCallback(html);
                    }
                },
                {
                    label: game.i18n.localize("MP.Cancel"),
                    icon: "fa-solid fa-times",
                    action: "cancel"
                }
            ]
        });

        async function rollAttackCallback(form) {
            const sourceIsVehicle = (actor.type === "vehicle"); 
            const targetIsVehicle = (target && target.actor.type === "vehicle");
            const sourceVehicleToHit = sourceIsVehicle ? actor.system.basetohit : null;
            const targetVehicleHasDef = (targetIsVehicle && (target.actor.system.defense !== null));
            const independentPower = (sourceIsVehicle && itemData.indpowersource);
            const indPowerSource = actor.items.get(itemData.indpowersource);
            const showCritRollButtons = game.settings.get(game.system.id, "showCritRollButtons");
            
            let modToHit = itemData.tohit ? Number.parseInt(itemData.tohit) : sourceVehicleToHit;
            let mod = "";
            let push = form.elements.push?.checked ?? false;
            let spendPower = (autoPowerSetting === 'choose' && (form.elements.autodeduct?.checked ?? false)) || autoPowerSetting === 'always';
            let spendCharges = itemData.usecharges && ((autoChargesSetting === 'choose' && (form.elements.autodeductcharge?.checked ?? false)) || autoChargesSetting === 'always' );
            let dmgFormula = itemData.dmgroll;
            let powerCost = itemData.powercost;
            let showTarget = game.settings.get(game.system.id, "showAttackTargetNumbers");
            let showCanRollWith = false;
            let showCanRollWithToGM = false;
            let chargeSourceId = itemData.chargesource;
            let chargeSource = null;
            let toHitBonus = 0; 
            let showBonus = false;
            let targetHasDef = target !== null;

            if (sourceIsVehicle) {
                toHitBonus = itemData.tohitbonus;
            }
            else
            {
                toHitBonus = getCharAblityToHitBonus(actor.items, itemData.bonusids);
            }

            if (chargeSourceId !== "") {
                chargeSource = actor.items.get(chargeSourceId);
            }

            if (target && (target.actor.type === "character")) {
                showCanRollWith = showCanRollWithChar;
            }
            else if (targetIsVehicle) {
                showCanRollWith = false;
                showCanRollWithToGM = false;
            }
            else {
                showCanRollWith = (showCanRollWithNPC == "always");
                showCanRollWithToGM = (showCanRollWithNPC == "gmonly");
            }

        
            
            if (checkPower && independentPower && (powerCost > indPowerSource.system.powervalue)) {
                ui.notifications.warn(game.i18n.localize("MP.NotEnoughIndPower") + ": " + game.i18n.localize("MP.Need") + " " + powerCost + ", " + game.i18n.localize("MP.Have") + " " + indPowerSource.system.powervalue);
            }
            else if (checkPower && (powerCost > actor.system.power.value)) {
                ui.notifications.warn(game.i18n.localize("MP.NotEnoughPower") + ": " + game.i18n.localize("MP.Need") + " " + powerCost + ", " + game.i18n.localize("MP.Have") + " " + actor.system.power.value);
            }
            else if (checkPower && (itemData.usecharges && (chargeSource.system.chargesused <= 0))) {
                ui.notifications.warn(itemData.name + ": " + game.i18n.localize("MP.OutOfCharges"));
            }
            else {
                if (targetName) {
                    mod = form.elements.mod?.value?.trim() ?? "";
                }

                if (mod != "") {
                    modToHit += (Number.parseInt(mod) - defense);
                    toHitBonus += Number.parseInt(mod);
                }
                
                if (sourceIsVehicle && (sourceVehicleToHit !== null)) { modToHit += toHitBonus; }

                if (!showTarget) {
                    let html = itemData.name + ": " + game.i18n.localize("MP.Target") + " = " + modToHit + "-";
                    if (target) {
                        html += " (vs " + targetName + ", ";
                        if (itemData.dmgtype == "DAMAGE.Psychic") {
                            html += game.i18n.localize("MP.MentalDefense");
                        }
                        else {
                            html += game.i18n.localize("MP.PhysicalDefense");
                        }
                        html += " " + defense + ")";
                    }
                    simpleGMWhisper(ChatMessage.getSpeaker({ actor: actor }), html);
                }

                if (push) {
                    dmgFormula += " + 2";
                    powerCost += 2;
                }

                let attackRoll = await new Roll("1d20").evaluate();
                attackRoll.dice[0].options.rollOrder = 1;

                let dmgRoll = await new Roll(dmgFormula).evaluate();
                dmgRoll.dice[0].options.rollOrder = 2;

                const rolls = [attackRoll, dmgRoll];
                const pool = PoolTerm.fromRolls(rolls);
                let roll = Roll.fromTerms([pool]);

                let success = attackRoll.total <= modToHit;

                let showRollWith = false;
                let rollWith = 0;
                if (target) {
                    rollWith = Math.floor(target.actor.system.power.value / 10);
                    showRollWith = showCanRollWith && (success || (sourceIsVehicle && !targetIsVehicle)); // go ahead & show roll with for attacks by vehicles since hit/miss isn't calculated
                    if (showCanRollWithToGM && (success || (sourceIsVehicle && !targetIsVehicle))) {
                        let html = itemName + ": " + target.name + " " + game.i18n.localize("MP.CanRollWithUpTo") + " " + rollWith + " " + game.i18n.localize("MP.points");
                        simpleGMWhisper(ChatMessage.getSpeaker({ actor: actor }), html);
                    }
                }

                let showSuccess = !!targetName;

                if ((sourceIsVehicle) || (targetIsVehicle && !targetVehicleHasDef)) { 
                    showTarget = (sourceVehicleToHit !== null); 
                    showBonus = !showTarget;
                    showSuccess = (sourceVehicleToHit !== null) && targetVehicleHasDef;
                    targetHasDef = targetIsVehicle ? targetVehicleHasDef : targetHasDef;
                }

                let rollData = {
                    actorName: actor.name,
                    attackName: itemName,
                    dmgType: itemData.dmgtype,
                    dmgSubtype: itemData.dmgsubtype,
                    knockBack: itemData.knockback,
                    targetName: targetName,
                    success: success,
                    attackRoll: attackRoll,
                    rollMinMax: rollMinMax(attackRoll.dice[0].total),
                    dmgRoll: dmgRoll,
                    isCrit: attackRoll.dice[0].total === 1,
                    isFumble: attackRoll.dice[0].total === 20,
                    showTarget: showTarget,
                    targetNum: modToHit,
                    showRollWith: showRollWith,
                    rollWith: rollWith,
                    showBonus: showBonus,
                    toHitBonus: toHitBonus,
                    showSuccess: showSuccess,
                    showCritRollButtons: showCritRollButtons && (attackRoll.dice[0].total === 1 || attackRoll.dice[0].total === 20),
                    owner: actor.id,
                    targetIsVehicle: targetIsVehicle,
                    targetHasDef: targetHasDef
                };



                let cardContent = await foundry.applications.handlebars.renderTemplate("systems/mighty-protectors/templates/chatcards/attackroll.hbs", rollData);

                let chatOptions = {
                    style: CONST.CHAT_MESSAGE_STYLES.ROLL,
                    rolls: [roll],
                    content: cardContent,
                    speaker: ChatMessage.getSpeaker({ actor: actor })
                };

                ChatMessage.create(chatOptions);

                if (spendPower && (powerCost > 0)) {
                    if (independentPower) {
                        let newPower = indPowerSource.system.powervalue - powerCost;
                        if (newPower < 0) newPower = 0;
                        await indPowerSource.update({ "system.powervalue": newPower });
                    }
                    else {
                        let newPower = actor.system.power.value - powerCost;
                        if (newPower < 0) newPower = 0;
                        await actor.update({ "system.power.value": newPower });
                    }
                }

                if (spendCharges && itemData.usecharges) {
                    let newCharges = chargeSource.system.chargesused -1;
                    if (newCharges < 0) newCharges = 0;
                    await chargeSource.update({"system.chargesused": newCharges});
                }
            }
        }
    }
}

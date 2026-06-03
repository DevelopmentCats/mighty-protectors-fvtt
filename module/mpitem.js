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

    prepareDerivedData() {
        super.prepareDerivedData();

        if (this.type === 'movement') this._prepareDerivedMovementData();
        if (this.type === 'attack') this._prepareDerivedAttackData();
        if (this.type === 'vehiclesystem') this._prepareDerivedVehicleSystemData();
        if (this.type === 'vehicleattack') this._prepareDerivedVehicleAttackData();
    }


    async _prepareDerivedMovementData() {
        const itemData = this.system;
        const actorData = this.actor ? this.actor.system : null;

        // don't bother unless the move item is attached to a character, is set to constant rate type, and not set to manual entry
        if (itemData.moverateformula == "manual") {
            this.system.calcmoverate = this.system.moverate;
        }
        else if (actorData && (itemData.moveratetype === "constant")) {

            let rate = 0;

            if (itemData.moverateformula === "ground") {
                rate = (
                    (
                        (actorData.basecharacteristics.st.value + actorData.basecharacteristics.ag.value + actorData.basecharacteristics.en.value)
                        / 3
                    ) - .5
                );

                rate = Math.round(rate);
            }
            else if (itemData.moverateformula === "leaping") {
                if (actorData.weight > 0) {
                    rate = actorData.carry / actorData.weight;
                    rate = Math.round(rate * 100) / 100;
                }
            }

            this.system.calcmoverate = rate;
        }
    }

    _prepareDerivedAttackData() {
        const itemData = this.system;
        const actorData = this.actor ? this.actor.system : null;

        if (actorData) {

            // first get save for appropriate stat
            let toHit = 3;
            switch (itemData.attribute) {
                case "AG":
                    toHit += actorData.basecharacteristics.ag.save;
                    break;
                case "IN":
                    toHit += actorData.basecharacteristics.in.save;
                    break;
                case "CL":
                    toHit += actorData.basecharacteristics.cl.save;
                    break;
            }

            toHit += getCharAblityToHitBonus(this.actor.items, itemData.bonusids);
            itemData.tohit = toHit;
        }
    }


    _prepareDerivedVehicleAttackData() {
        const itemData = this.system;
        const actorData = this.actor ? this.actor.system : null;

        if (actorData) {
            // then calc selected bonuses from abilities
            const items = this.actor.items;
            const bonusids = itemData.bonusids;
            let totalbonus = 0;

            if (bonusids) {
                for (let i of items) {
                    if (i.type === 'vehiclesystem' && i.system.tohitbonus && bonusids.includes(i.id)) {
                        totalbonus += i.system.tohitbonus;
                    }
                }
            }
          
            itemData.tohitbonus = totalbonus;
        }
    }

    async _prepareDerivedVehicleSystemData() {
        const itemData = this.system;

        if (itemData.systemspaces) {
            const vehSysList = MP.VehicleSystemsTable.filter(tableRow => (tableRow.spaces <= itemData.systemspaces));
            const vehSysData = vehSysList[vehSysList.length -1];

            let cps = vehSysData.cps;

            if (itemData.open) {
                const openSysList = MP.VehicleSystemsTable.filter(tableRow => (tableRow.spaces <= itemData.systemspaces/4));
                const openSysData = openSysList[openSysList.length -1];
                cps = openSysData.cps;
            }

            let hitsBonus = 0;
            hitsBonus += itemData.bulky ? Math.ceil((itemData.bulky/2.5)*4.3) : 0;
            hitsBonus -= itemData.delicate ? Math.ceil((itemData.delicate/2.5)*4.3) : 0;

            itemData.profile = vehSysData.profile;
            itemData.hits = vehSysData.hits + hitsBonus;
            itemData.points = itemData.integral ? Math.ceil(cps/2) : cps;
        }
    }

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

        let dlgContent = await renderTemplate("systems/mighty-protectors/templates/dialogs/attackmods.hbs", dlgData);

        // TODO: Migrate to DialogV2 (Dialog is deprecated in Foundry v13+)
        let dlg = new Dialog({
            title: game.i18n.localize("ITEM.TypeAttack") + ": " + itemName,
            content: dlgContent,
            buttons: {
                rollAttack: {
                    icon: "<i class='fas fa-dice-d20'></i>",
                    label: game.i18n.localize("MP.Roll"),
                    callback: (html) => rollAttackCallback(html)
                },
                cancel: {
                    icon: "<i class='fas fa-times'></i>",
                    label: game.i18n.localize("MP.Cancel")
                }
            },
            default: "rollAttack"
        });

        dlg.render(true);


        async function rollAttackCallback(html) {
            const sourceIsVehicle = (actor.type === "vehicle"); 
            const targetIsVehicle = (target && target.actor.type === "vehicle");
            const sourceVehicleToHit = sourceIsVehicle ? actor.system.basetohit : null;
            const targetVehicleHasDef = (targetIsVehicle && (target.actor.system.defense !== null));
            const independentPower = (sourceIsVehicle && itemData.indpowersource);
            const indPowerSource = actor.items.get(itemData.indpowersource);
            const showCritRollButtons = game.settings.get(game.system.id, "showCritRollButtons");
            
            let modToHit = itemData.tohit ? Number.parseInt(itemData.tohit) : sourceVehicleToHit;
            let mod = "";
            let push = html.find('[name="push"]')[0].checked;
            let spendPower = (autoPowerSetting === 'choose' && html.find('[name="autodeduct"]')[0].checked) || autoPowerSetting === 'always';
            let spendCharges = itemData.usecharges && ((autoChargesSetting === 'choose' && html.find('[name="autodeductcharge"]')[0].checked) || autoChargesSetting === 'always' );
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
                    mod = html.find('[name="mod"]')[0].value.trim();
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



                let cardContent = await renderTemplate("systems/mighty-protectors/templates/chatcards/attackroll.hbs", rollData);

                let chatOptions = {
                    type: CONST.CHAT_MESSAGE_STYLES.ROLL,
                    roll: roll,
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

                if (spendCharges && itemData.system.usecharges) {
                    let newCharges = chargeSource.system.chargesused -1;
                    if (newCharges < 0) newCharges = 0;
                    await chargeSource.update({"system.chargesused": newCharges});
                }
            }
        }
    }
}
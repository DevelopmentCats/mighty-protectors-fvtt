import { MP } from './config.js';
import {simpleGMWhisper, rollMinMax, timeBreakdown} from './utility.js';

/**
 * Override and extend the basic Actor implementation.
 * @extends {Actor}
 */
export default class MPActor extends Actor {

    /**
     * Extends Actor._preCreate to add default images by actor type
     * @param {*} data 
     * @param {*} options 
     * @param {*} userId 
     */
    async _preCreate(data, options, userId) {
        await super._preCreate(data, options, userId);

        // assign a default image based on item type
        if (!data.img) {
            const img = MP.ActorTypeImages[data.type];
            if (img) await this.updateSource({ img });
        }

        // set some token defaults for player characters
        if ( this.type === "character" ) {
            this.updateSource({prototypeToken:{
                actorLink: true, 
                disposition: 1,
                sight: {enabled: true}
            }});
        }
    }

    async _onCreate (data, options, userId) {
        if (this.type === 'vehicle') {
            // add an item for default armor
            const protItemData = {
                name: game.i18n.localize("MP.BaseVehicleArmor"),
                type: "protection"
            }


            const protIitem = new Item(protItemData);

            const newItem = await this.createEmbeddedDocuments("Item", [protIitem.toObject()]);

            await newItem[0].update({ 'system.kinetic': 3,
                'system.energy': 3,
                'system.bio': 3,
                'system.entropy': 3
            });
        }
    }

    /**
     * @override
     * Actor-level prepareDerivedData - calls super which triggers TypeDataModel.prepareDerivedData(),
     * then does any actor-level work that requires iterating items (like move speeds and to-hit values).
     */
    prepareDerivedData() {
        super.prepareDerivedData();

        // After TypeDataModel.prepareDerivedData() runs, update item-level derived data
        // that depends on actor stats (items prepare before actors, so we re-run here)
        if (this.type === 'character' || this.type === 'npc') {
            this.updateMoveSpeeds();
            this.updateToHitValues();
        }
    }

    /**
     * Total up stat changes caused by abilities
     * @returns {object} Aggregated bonuses from all abilities
     */
    getAbilityBonuses() {
        const abilityBonuses = {
            cpcost: 0,
            ipcost: 0,
            st: 0,
            ag: 0,
            en: 0,
            in: 0,
            cl: 0,
            physdef: 0,
            mentdef: 0,
            power: 0,
            hp: 0,
            init: 0,
            luck: 0,
            multiinit: false,
            ip: 0
        };

        const abilities = this.items.filter(item => item.type === "ability");

        for (const ability of abilities) {
            abilityBonuses.cpcost += ability.system.cpcost || 0;
            abilityBonuses.ipcost += ability.system.ipcost || 0;
            abilityBonuses.st += ability.system.stbonus || 0;
            abilityBonuses.ag += ability.system.agbonus || 0;
            abilityBonuses.en += ability.system.enbonus || 0;
            abilityBonuses.in += ability.system.inbonus || 0;
            abilityBonuses.cl += ability.system.clbonus || 0;
            abilityBonuses.physdef += ability.system.physdefbonus || 0;
            abilityBonuses.mentdef += ability.system.mentdefbonus || 0;
            abilityBonuses.power += ability.system.powerbonus || 0;
            abilityBonuses.hp += ability.system.hpbonus || 0;
            abilityBonuses.init += ability.system.initbonus || 0;
            abilityBonuses.luck += ability.system.luckbonus || 0;
            abilityBonuses.ip += ability.system.ipbonus || 0;
            if (ability.system.multiinit) abilityBonuses.multiinit = true;
        }

        return abilityBonuses;
    }

    /**
     * Calculate the base stats (ST, AG, EN, IN, CL) from points spent & bonuses from abilities
     * @param {object} bonuses - Ability bonuses object
     */
    prepareCharacterBaseAttributes(bonuses) {
        const actorData = this.system;

        actorData.basecharacteristics.st.value = actorData.basecharacteristics.st.cp + bonuses.st;
        actorData.basecharacteristics.en.value = actorData.basecharacteristics.en.cp + bonuses.en;
        actorData.basecharacteristics.ag.value = actorData.basecharacteristics.ag.cp + bonuses.ag;
        actorData.basecharacteristics.in.value = actorData.basecharacteristics.in.cp + bonuses.in;
        actorData.basecharacteristics.cl.value = actorData.basecharacteristics.cl.cp + bonuses.cl;
    }

    /**
     * Item updates happen before actor updates, not after
     * So have to force these to update after base stat changes to reflect the new values
     */
    updateMoveSpeeds() {
        for (let i of this.items) {
            if (i.type === 'movement') {
                i.system.prepareDerivedData();
            }
        }
    }

    /**
     * Item updates happen before actor updates, not after
     * So have to force these to update after base stat changes to reflect the new values
     */
    updateToHitValues() {
        for (let i of this.items) {
            if (i.type === 'attack') {
                i.system.prepareDerivedData();
            }
        }
    }

    /**
     * Look up the stats associated with each base attribute value from the big giant table of stats
     * @returns {object} Stat table entries for each characteristic
     */
    getStatData() {
        const actorData = this.system;
        return {
            st: MP.StatTable.filter(tableRow => (tableRow.min <= actorData.basecharacteristics.st.value && tableRow.max >= actorData.basecharacteristics.st.value))[0],
            en: MP.StatTable.filter(tableRow => (tableRow.min <= actorData.basecharacteristics.en.value && tableRow.max >= actorData.basecharacteristics.en.value))[0],
            ag: MP.StatTable.filter(tableRow => (tableRow.min <= actorData.basecharacteristics.ag.value && tableRow.max >= actorData.basecharacteristics.ag.value))[0],
            in: MP.StatTable.filter(tableRow => (tableRow.min <= actorData.basecharacteristics.in.value && tableRow.max >= actorData.basecharacteristics.in.value))[0],
            cl: MP.StatTable.filter(tableRow => (tableRow.min <= actorData.basecharacteristics.cl.value && tableRow.max >= actorData.basecharacteristics.cl.value))[0]
        };
    }

    /**
     * Get bonuses from vehicle systems
     * @returns {object} Aggregated bonuses from all vehicle systems
     */
    getVehicleSystemBonuses() {
        const vehicleSystemBonuses = {
            "cpcost": 5,
            "systemspaces": 0,
            "stbonus": 0,
            "enbonus": 0,
            "agbonus": 0,
            "inbonus": 0,
            "clbonus": 0,
            "maneuverability": 0,
            "powerbonus": 0,
            "hpbonus": 0
        };
        const systems = this.items.filter(item => item.type === "vehiclesystem");

        for (const vsystem of systems) {
            vehicleSystemBonuses.cpcost += vsystem.system.cost || 0;
            vehicleSystemBonuses.systemspaces += vsystem.system.systemspaces || 0;
            vehicleSystemBonuses.stbonus += vsystem.system.stbonus || 0;
            vehicleSystemBonuses.enbonus += vsystem.system.enbonus || 0;
            vehicleSystemBonuses.agbonus += vsystem.system.agbonus || 0;
            vehicleSystemBonuses.inbonus += vsystem.system.inbonus || 0;
            vehicleSystemBonuses.clbonus += vsystem.system.clbonus || 0;
            vehicleSystemBonuses.maneuverability += vsystem.system.maneuverability || 0;
            vehicleSystemBonuses.powerbonus += vsystem.system.powerbonus || 0;
            vehicleSystemBonuses.hpbonus += vsystem.system.hpbonus || 0;
        }

        return vehicleSystemBonuses;
    }

    /**
     * Get mass roll formula based on weight
     * @param {number} weight - Character weight
     * @returns {string} Mass roll formula
     */
    getMassRoll(weight) {
        let massRoll = "";

        if (weight > 0) {
            // halve the weight value and check the big table for the closest value in 'carry', and get its index
            weight = weight / 2;

            let closestValue = Infinity;
            let closestIndex = -1;
            for (let i = 0; i < MP.StatTable.length; ++i) {
                let diff = Math.abs(MP.StatTable[i].carry - weight);
                if (diff < closestValue) {
                    closestValue = diff;
                    closestIndex = i;
                }
            }
            massRoll = MP.StatTable[closestIndex].hth_init;
        }
        return massRoll;
    }

    /**
     * Roll a saving throw
     * @param {object} dataset - Dataset with roll info
     */
    async rollSave(dataset) {
        if (dataset.roll) {
            let dlgContent = await foundry.applications.handlebars.renderTemplate("systems/mighty-protectors/templates/dialogs/modifiers.hbs", dataset);
            let title = game.i18n.localize("MP.SavingThrow");
            if (dataset.rolltype) title = dataset.rolltype;

            await foundry.applications.api.DialogV2.wait({
                window: { title: title + ": " + dataset.stat },
                content: dlgContent,
                buttons: [
                    {
                        label: game.i18n.localize("MP.Roll"),
                        icon: "fa-solid fa-dice-d20",
                        action: "rollSave",
                        default: true,
                        callback: async (event, button, dialog) => {
                            let modTarget = Number.parseInt(dataset.target);
                            let mod = button.form.elements.mod?.value?.trim() ?? "";
                            let showTarget = game.settings.get(game.system.id, "showSaveTargetNumbers");

                            if (mod !== "") {
                                modTarget += Number.parseInt(mod);
                            }

                            if (!showTarget) {
                                simpleGMWhisper(
                                    ChatMessage.getSpeaker({ actor: this }),
                                    title + ": " + dataset.stat + ", " + game.i18n.localize("MP.Target") + " = " + modTarget + "-"
                                );
                            }

                            const roll = await new Roll(dataset.roll).evaluate();

                            const rollData = {
                                stat: dataset.stat,
                                formula: roll.formula,
                                total: roll.total,
                                target: modTarget,
                                showTarget: showTarget,
                                success: roll.total <= modTarget,
                                dieFormula: roll.dice[0].formula,
                                dieRoll: roll.dice[0].total,
                                rollMinMax: rollMinMax(roll.dice[0].total),
                                rolltype: dataset.rolltype
                            };

                            const cardContent = await foundry.applications.handlebars.renderTemplate(
                                "systems/mighty-protectors/templates/chatcards/savingthrow.hbs",
                                rollData
                            );

                            ChatMessage.create({
                                style: CONST.CHAT_MESSAGE_STYLES.ROLL,
                                rolls: [roll],
                                content: cardContent,
                                speaker: ChatMessage.getSpeaker({ actor: this })
                            });
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
    }

    /**
     * Roll a generic roll
     * @param {object} dataset - Dataset with roll info
     */
    async rollGeneric(dataset) {
        if (dataset.roll) {
            let roll = new Roll(dataset.roll, this.system);
            let label = dataset.stat ? `Rolling ${dataset.stat}` : '';
            await roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this }),
                flavor: label
            });
        }
    }

    /**
     * Recover all HP and Power
     */
    async recoverAll() {
        let chatOptions = {
            content: game.i18n.localize("MP.FullRest") + ".",
            speaker: ChatMessage.getSpeaker({ actor: this })
        };

        ChatMessage.create(chatOptions);

        return await this.update({'system.hitpts.value': this.system.hitpts.max, 'system.power.value': this.system.power.max});
    }

    /**
     * Timed recovery of HP and Power
     * @param {string} timeframe - Time unit (minutes/hours/days)
     * @param {number} healtime - Amount of time
     */
    async timedRecovery(timeframe, healtime) {
        if (healtime > 0) {
            // turn everything into minutes for now
            let minutes = healtime;  // default to minute
            if (timeframe == 'MP.HealTimes.Hours') minutes = healtime * 60;
            if (timeframe == 'MP.HealTimes.Days') minutes = healtime * 60 * 24;

            
            let breakdown = timeBreakdown(minutes);
            let timeText = "";
            if (breakdown.days > 0) timeText = `${breakdown.days} ${game.i18n.localize("MP.day(s)")}`;
            if (breakdown.hours > 0 || (breakdown.days > 0 && breakdown.mins > 0)) {  // even if hours are 0, show if min & days are non-0
                if (timeText.length > 0) timeText += ", ";
                timeText += `${breakdown.hours} ${game.i18n.localize("MP.hour(s)")}`;
            }
            if (breakdown.mins > 0) {  
                if (timeText.length > 0) timeText += ", ";
                timeText += `${breakdown.mins} ${game.i18n.localize("MP.minute(s)")}`;
            }

            let msg = `<p>${this.name} ${game.i18n.localize("MP.restsfor")} ${timeText}</p>`;

            // heal power first and subtract that time from total
            let newPower = 0;
            let powerRec = 0;
            let diff = this.system.power.max - this.system.power.value;
            if (diff >= minutes) {
                newPower = this.system.power.value + minutes;
                powerRec = minutes;
                minutes = 0;
            }
            else {
                newPower = this.system.power.max;
                powerRec = diff;
                minutes = minutes - diff;
            }

            if (powerRec > 0) {
                msg += `<p>${powerRec} ${game.i18n.localize("MP.power")} ${game.i18n.localize("MP.recovered")}.</p>`;
            }
            

            // turn remaining time back into days for hp healing
            let hpDays = Math.floor(minutes / (60 * 24));
            let hpHealed = 0;
            let newHP = this.system.hitpts.value;
            let dec = 0;
            var roll;
            let hpRecovered = "";
            diff = this.system.hitpts.max - this.system.hitpts.value;

            if (hpDays > 0 && diff > 0) {
                hpHealed = Math.floor(hpDays) * Math.floor(this.system.healing);

                // handle fractional healing rolls for each day
                dec = (this.system.healing + "").split(".")[1];

                if (dec > 0) {
                    let rollFormula = hpDays + "d10";
                    roll = await new Roll(rollFormula).evaluate();
                    for (var i = 0; i < roll.dice[0].results.length; i++) {
                        if (roll.dice[0].results[i].result <= dec) ++hpHealed;
                    }
                }
                newHP = Math.min(newHP + hpHealed, this.system.hitpts.max);

                hpRecovered = `<p>${Math.min(hpHealed, diff)} ${game.i18n.localize("MP.hitpoints")} ${game.i18n.localize("MP.recovered")}.</p>`;
            }

            let chatOptions = {};

            if (dec > 0 && hpHealed > 0) {
                // if there were dice rolls for fractional heals, need to show them
                msg += `<p>${game.i18n.localize("MP.fractionalheal")} (${game.i18n.localize("MP.Target")} <= ${dec}):</p>`;
                msg += await roll.render();
                msg += hpRecovered;
                chatOptions = {
                    style: CONST.CHAT_MESSAGE_STYLES.ROLL,
                    rolls: [roll],
                    content: msg,
                    speaker: ChatMessage.getSpeaker({ actor: this })
                };
            }
            else {
                // otherwise just a normal message
                chatOptions = {
                    content: msg + hpRecovered,
                    speaker: ChatMessage.getSpeaker({ actor: this })
                };
            }

            ChatMessage.create(chatOptions);

            return await this.update({'system.hitpts.value': newHP, 'system.power.value': newPower});
        }
        else {
            ui.notifications.warn(game.i18n.localize("Warnings.BadHealNumber"));
        }
    }
}

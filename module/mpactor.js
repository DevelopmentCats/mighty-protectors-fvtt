import { MP } from './config.js';
import {simplifyDice, simpleGMWhisper, rollMinMax, timeBreakdown} from './utility.js';

/**
 * Override and extend the basic Item implementation.
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


    prepareDerivedData() {
        super.prepareDerivedData();

        if (this.type === 'character' || this.type === 'npc') this._prepareDerivedCharacterData();
        if (this.type === 'vehicle') this._prepareDerivedVehicleData();
    }

    _prepareDerivedCharacterData() {
        const actorData = this.system;

        // let's do this in the right order
        const abilityBonuses = this.getAbilityBonuses();
        this.prepareCharacterBaseAttributes(abilityBonuses);       
        const statData = this.getStatData();
        

        // have to set 'em all anyway so might as well do the rest in one place
        actorData.basecharacteristics.en.save = statData.en.save;
        actorData.basecharacteristics.ag.save = statData.ag.save;
        actorData.basecharacteristics.in.save = statData.in.save;
        actorData.basecharacteristics.cl.save = statData.cl.save;

        this.updateToHitValues();
        actorData.multiinit = abilityBonuses.multiinit;
        actorData.carry = statData.st.carry;
        this.updateMoveSpeeds(); // some move speeds may need updates from carry & stats
        actorData.hth = statData.st.hth_init;
        actorData.mass = this.getMassRoll(actorData.weight);
        actorData.stat_cp = 
            actorData.basecharacteristics.st.cp
            + actorData.basecharacteristics.en.cp
            + actorData.basecharacteristics.ag.cp
            + actorData.basecharacteristics.in.cp
            + actorData.basecharacteristics.cl.cp;
        actorData.ability_cp = abilityBonuses.cpcost;
        actorData.total_cp = abilityBonuses.cpcost + actorData.stat_cp;
        actorData.avail_ip = Math.ceil(actorData.basecharacteristics.in.value/2) + abilityBonuses.ip;
        actorData.used_ip = abilityBonuses.ipcost;
        actorData.spent_xp = actorData.total_cp - actorData.base_cp;

        actorData.caps = {};
        actorData.caps.bcs = Math.floor((actorData.total_cp/5)+10);
        actorData.caps.ability = Math.floor(actorData.total_cp/5);
        actorData.caps.dmg = Math.floor((actorData.total_cp/12.5)+3);
        actorData.gear = {};
        actorData.gear.break = Math.floor((actorData.total_cp/25)+5);
        actorData.gear.take = Math.floor((actorData.total_cp/25)+6);
        actorData.gear.disarm = Math.floor((actorData.total_cp/25)+3);
        actorData.gear.gbc = Math.floor((actorData.total_cp/15)+6);
        
        actorData.clearance = actorData.basecharacteristics.in.save + actorData.basecharacteristics.cl.save + (actorData.earned_xp/5) - 20;
        if (actorData.clearance < 1) actorData.clearance = 1;
        if (actorData.clearance > 20) actorData.clearance = 20;
        

        // need to add ability bonuses to these
        actorData.luck = 10 + abilityBonuses.luck; 
        actorData.healing = statData.en.heal;
        actorData.physicaldefense = (actorData.basecharacteristics.ag.save -10) + abilityBonuses.physdef;
        actorData.mentaldefense = (actorData.basecharacteristics.in.save -10) + abilityBonuses.mentdef;
        actorData.initiative = simplifyDice(statData.cl.hth_init + " + " + abilityBonuses.init)     ;  
        actorData.hitpts.max = statData.st.hits_st + statData.ag.hits_ag + statData.en.hits_en + statData.cl.hits_cl + abilityBonuses.hp;
        actorData.power.max = actorData.basecharacteristics.st.value + actorData.basecharacteristics.ag.value + actorData.basecharacteristics.en.value + actorData.basecharacteristics.in.value + abilityBonuses.power;
    }

    /**
     * total up stat changes caused by abilities
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

        const abilities = this.items.filter(item => item.type=="ability" );

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
     * calculate the base stats (ST, AG, EN, IN, CL) from points spent & bonuses from abilities
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
                i._prepareDerivedMovementData();
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
                i._prepareDerivedAttackData();
            }
        }
    }


    /**
     * Look up the stats associted with eachg base attribute value from the big giant table of stats
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


    _prepareDerivedVehicleData() {
        const actorData = this.system;
        
        const adjustedCost = actorData.basic_cost + (actorData.is_base ? 15 : 0);

        const vehList = MP.VehicleTable.filter(tableRow => (tableRow.cps <= adjustedCost));
        const vehTableData = vehList[vehList.length -1];
        const vehicleSystemBonuses = this.getVehicleSystemBonuses();

        actorData.spaces = vehTableData.spaces;
        actorData.weight = vehTableData.weight;
        actorData.mass = vehTableData.mass;
        actorData.profile = vehTableData.profile;
        actorData.basecharacteristics.st.value = vehTableData.st + vehicleSystemBonuses.stbonus;
        actorData.basecharacteristics.en.value = vehTableData.en + vehicleSystemBonuses.enbonus;
        actorData.basecharacteristics.ag.value = 9 + vehicleSystemBonuses.agbonus;
        actorData.basecharacteristics.in.value = 0 + vehicleSystemBonuses.inbonus;
        actorData.basecharacteristics.cl.value = 9 + vehicleSystemBonuses.clbonus;
        actorData.turnrate = 3 + vehicleSystemBonuses.maneuverability;
        actorData.hitpts.max = vehTableData.hits + vehicleSystemBonuses.hpbonus;
        actorData.power.max = (actorData.basecharacteristics.st.value || 0) +
            (actorData.basecharacteristics.en.value || 0) +
            (actorData.basecharacteristics.ag.value || 0) +
            (actorData.basecharacteristics.in.value || 0) +
            vehicleSystemBonuses.powerbonus;
        const exploD8s = 1 + Math.floor(adjustedCost/5);
        const exploD4s = (adjustedCost % 5) ? 1 : 0;
        actorData.explosion = exploD8s + "d8" + (exploD4s ? "+1d4" : "");
        actorData.explosionarea = (2*Math.floor(vehTableData.profile/2)) + 1;

        const statData = this.getStatData();
        actorData.basecharacteristics.en.save = statData.en.save;
        actorData.basecharacteristics.ag.save = statData.ag.save;
        actorData.handling = statData.ag.save - 10;
        actorData.basecharacteristics.in.save = statData.in.save;
        actorData.basecharacteristics.cl.save = statData.cl.save;

        actorData.hth = statData.st.hth_init;
        actorData.initiative = statData.cl.hth_init;

        actorData.spacesLeft = vehTableData.spaces - vehicleSystemBonuses.systemspaces;
        actorData.total_cp = vehicleSystemBonuses.cpcost;

        actorData.travelrates = {};
        if (actorData.firstaccel > 0 && actorData.inchesperhex > 0) {
            const baseRate = actorData.firstaccel / actorData.turnrate / actorData.inchesperhex;
            actorData.travelrates.accel1 = Math.round(baseRate);
            actorData.travelrates.accel2 = Math.round(baseRate * 2);
            actorData.travelrates.speednormalmax = Math.round(baseRate * 4);
            actorData.travelrates.speedpushedmax = Math.round(baseRate * 8);
            actorData.travelrates.flightnormalmax = Math.round(baseRate * 16);
            actorData.travelrates.flightpushedmax = Math.round(baseRate * 32);
        }
    }

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
        const systems = this.items.filter(item => item.type=="vehiclesystem" );

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
     * 
     * @param {int} weight 
     */
    getMassRoll(weight) {
        let massRoll = "";

        if (weight > 0) {
            // halve the weight value and check the big table for the closest value in 'carry', and get its index
            weight = weight/2;

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
     * @param {*} dataset 
     */
    async rollSave(dataset) {
        if (dataset.roll) {
            let dlgContent = await renderTemplate("systems/mighty-protectors/templates/dialogs/modifiers.hbs", dataset);
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
                                    ChatMessage.getSpeaker({ actor: dataset.actor }),
                                    title + ": " + dataset.stat + ", " + game.i18n.localize("MP.Target") + " = " + modTarget + "-"
                                );
                            }

                            const roll = await new Roll(dataset.roll).evaluate();

                            const rollData = {
                                stat: dataset.stat,
                                formula: roll._formula,
                                total: roll.total,
                                target: modTarget,
                                showTarget: showTarget,
                                success: roll.total <= modTarget,
                                dieFormula: roll.dice[0].formula,
                                dieRoll: roll.dice[0].total,
                                rollMinMax: rollMinMax(roll.dice[0].total),
                                rolltype: dataset.rolltype
                            };

                            const cardContent = await renderTemplate(
                                "systems/mighty-protectors/templates/chatcards/savingthrow.hbs",
                                rollData
                            );

                            ChatMessage.create({
                                type: CONST.CHAT_MESSAGE_STYLES.ROLL,
                                roll: roll,
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

    async recoverAll() {
        let chatOptions = {
            content: game.i18n.localize("MP.FullRest") + ".",
            speaker: ChatMessage.getSpeaker({ actor: this })
        };

        ChatMessage.create(chatOptions);

        return await this.update({'system.hitpts.value': this.system.hitpts.max, 'system.power.value': this.system.power.max});
    }

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
                    type: CONST.CHAT_MESSAGE_STYLES.ROLL,
                    roll: roll,
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

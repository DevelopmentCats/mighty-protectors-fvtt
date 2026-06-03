/**
 * TypeDataModel definitions for Mighty Protectors Actors (v14+)
 *
 * Replaces the legacy template.json Actor block.
 * Each class defines the schema for its actor type's `system` data.
 *
 * Fields are split into two groups:
 *  - Stored fields: persisted to the database (user-editable data)
 *  - Derived fields: computed in prepareDerivedData(), never stored
 *    (declared here so templates can always access them)
 */

import { MP } from '../config.js';
import { simplifyDice } from '../utility.js';

const { fields } = foundry.data;

// ─── Shared field builders ────────────────────────────────────────────────────

function resourceField(valueDefault = 4, maxDefault = 4) {
    return new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: valueDefault }),
        max:   new fields.NumberField({ required: true, integer: true, initial: maxDefault })
    });
}

function charField(cpDefault = 10) {
    return new fields.SchemaField({
        cp:    new fields.NumberField({ required: true, integer: true, initial: cpDefault }),
        value: new fields.NumberField({ required: true, integer: true, initial: cpDefault }),
        save:  new fields.NumberField({ required: true, integer: true, initial: 10 })
    });
}

function baseCharacteristicsField() {
    return new fields.SchemaField({
        st: charField(10),
        en: charField(10),
        ag: charField(10),
        in: charField(10),
        cl: charField(10)
    });
}

// ─── CharacterDataModel (character + npc) ────────────────────────────────────

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // ── Stored fields ──────────────────────────────────────────────
            hitpts:               resourceField(4, 4),
            power:                resourceField(40, 40),
            basecharacteristics:  baseCharacteristicsField(),

            trueID:       new fields.StringField({ required: true, initial: "" }),
            side:         new fields.StringField({ required: true, initial: "" }),
            birthplace:   new fields.StringField({ required: true, initial: "" }),
            species:      new fields.StringField({ required: true, initial: "" }),
            culture:      new fields.StringField({ required: true, initial: "" }),
            age:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            gender:       new fields.StringField({ required: true, initial: "" }),
            weight:       new fields.NumberField({ required: true, integer: true, initial: 120 }),
            story:        new fields.StringField({ required: true, initial: "" }),
            motivation:   new fields.StringField({ required: true, initial: "" }),
            wealth:       new fields.StringField({ required: true, initial: "d4" }),
            origintype:   new fields.StringField({ required: true, initial: "" }),
            legalstatus:  new fields.StringField({ required: true, initial: "" }),
            hasclearance: new fields.BooleanField({ required: true, initial: false }),
            base_cp:      new fields.NumberField({ required: true, integer: true, initial: 50 }),
            earned_xp:    new fields.NumberField({ required: true, integer: true, initial: 0 }),

            // ── Derived fields (computed in prepareDerivedData) ────────────
            multiinit:       new fields.BooleanField({ required: false, initial: false }),
            carry:           new fields.StringField({ required: false, nullable: true, initial: null }),
            hth:             new fields.StringField({ required: false, nullable: true, initial: null }),
            mass:            new fields.StringField({ required: false, nullable: true, initial: null }),
            stat_cp:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            ability_cp:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            total_cp:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            avail_ip:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            used_ip:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            spent_xp:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            clearance:       new fields.NumberField({ required: false, nullable: true, initial: null }),
            luck:            new fields.NumberField({ required: false, nullable: true, initial: null }),
            healing:         new fields.NumberField({ required: false, nullable: true, initial: null }),
            physicaldefense: new fields.NumberField({ required: false, nullable: true, initial: null }),
            mentaldefense:   new fields.NumberField({ required: false, nullable: true, initial: null }),
            initiative:      new fields.StringField({ required: false, nullable: true, initial: null }),
            caps:            new fields.ObjectField({ required: false, nullable: true, initial: null }),
            gear:            new fields.ObjectField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `actor.system`
        // `this.parent` IS the actor document

        const abilityBonuses = this.parent.getAbilityBonuses();
        this.parent.prepareCharacterBaseAttributes(abilityBonuses);
        const statData = this.parent.getStatData();

        // Set saves from stat table
        this.basecharacteristics.en.save = statData.en.save;
        this.basecharacteristics.ag.save = statData.ag.save;
        this.basecharacteristics.in.save = statData.in.save;
        this.basecharacteristics.cl.save = statData.cl.save;

        // Derived fields
        this.multiinit = abilityBonuses.multiinit;
        this.carry = statData.st.carry;
        this.hth = statData.st.hth_init;
        this.mass = this.parent.getMassRoll(this.weight);

        this.stat_cp =
            this.basecharacteristics.st.cp +
            this.basecharacteristics.en.cp +
            this.basecharacteristics.ag.cp +
            this.basecharacteristics.in.cp +
            this.basecharacteristics.cl.cp;

        this.ability_cp = abilityBonuses.cpcost;
        this.total_cp = abilityBonuses.cpcost + this.stat_cp;
        this.avail_ip = Math.ceil(this.basecharacteristics.in.value / 2) + abilityBonuses.ip;
        this.used_ip = abilityBonuses.ipcost;
        this.spent_xp = this.total_cp - this.base_cp;

        // Caps
        this.caps = {};
        this.caps.bcs = Math.floor((this.total_cp / 5) + 10);
        this.caps.ability = Math.floor(this.total_cp / 5);
        this.caps.dmg = Math.floor((this.total_cp / 12.5) + 3);

        // Gear caps
        this.gear = {};
        this.gear.break = Math.floor((this.total_cp / 25) + 5);
        this.gear.take = Math.floor((this.total_cp / 25) + 6);
        this.gear.disarm = Math.floor((this.total_cp / 25) + 3);
        this.gear.gbc = Math.floor((this.total_cp / 15) + 6);

        // Clearance
        this.clearance = this.basecharacteristics.in.save + this.basecharacteristics.cl.save + (this.earned_xp / 5) - 20;
        if (this.clearance < 1) this.clearance = 1;
        if (this.clearance > 20) this.clearance = 20;

        // Combat stats
        this.luck = 10 + abilityBonuses.luck;
        this.healing = statData.en.heal;
        this.physicaldefense = (this.basecharacteristics.ag.save - 10) + abilityBonuses.physdef;
        this.mentaldefense = (this.basecharacteristics.in.save - 10) + abilityBonuses.mentdef;
        this.initiative = simplifyDice(statData.cl.hth_init + " + " + abilityBonuses.init);

        // Resource maximums
        this.hitpts.max = statData.st.hits_st + statData.ag.hits_ag + statData.en.hits_en + statData.cl.hits_cl + abilityBonuses.hp;
        this.power.max = this.basecharacteristics.st.value +
            this.basecharacteristics.ag.value +
            this.basecharacteristics.en.value +
            this.basecharacteristics.in.value +
            abilityBonuses.power;
    }
}

// ─── NPCDataModel (same schema and logic as character) ────────────────────────

export class NPCDataModel extends CharacterDataModel {}

// ─── VehicleDataModel ────────────────────────────────────────────────────────

export class VehicleDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // ── Stored fields ──────────────────────────────────────────────
            hitpts:              resourceField(4, 4),
            power:               resourceField(40, 40),
            basecharacteristics: baseCharacteristicsField(),

            model:               new fields.StringField({ required: true, initial: "" }),
            operator:            new fields.StringField({ required: true, initial: "" }),
            basic_cost:          new fields.NumberField({ required: true, integer: true, initial: 5 }),
            is_base:             new fields.NumberField({ required: true, integer: true, initial: 0 }),
            techcostadjustment:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
            firstaccel:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inchesperhex:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            defense:             new fields.NumberField({ required: false, nullable: true, initial: null }),
            basetohit:           new fields.NumberField({ required: false, nullable: true, initial: null }),

            // ── Derived fields (computed in prepareDerivedData) ────────────
            spaces:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            weight:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            mass:          new fields.StringField({ required: false, nullable: true, initial: null }),
            profile:       new fields.NumberField({ required: false, nullable: true, initial: null }),
            turnrate:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            explosion:     new fields.StringField({ required: false, nullable: true, initial: null }),
            explosionarea: new fields.NumberField({ required: false, nullable: true, initial: null }),
            handling:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            hth:           new fields.StringField({ required: false, nullable: true, initial: null }),
            initiative:    new fields.StringField({ required: false, nullable: true, initial: null }),
            spacesLeft:    new fields.NumberField({ required: false, nullable: true, initial: null }),
            total_cp:      new fields.NumberField({ required: false, nullable: true, initial: null }),
            travelrates:   new fields.ObjectField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `actor.system`
        // `this.parent` IS the actor document

        const adjustedCost = this.basic_cost + (this.is_base ? 15 : 0);

        const vehList = MP.VehicleTable.filter(tableRow => (tableRow.cps <= adjustedCost));
        const vehTableData = vehList[vehList.length - 1];
        const vehicleSystemBonuses = this.parent.getVehicleSystemBonuses();

        this.spaces = vehTableData.spaces;
        this.weight = vehTableData.weight;
        this.mass = vehTableData.mass;
        this.profile = vehTableData.profile;

        // Base characteristics from vehicle table + system bonuses
        this.basecharacteristics.st.value = vehTableData.st + vehicleSystemBonuses.stbonus;
        this.basecharacteristics.en.value = vehTableData.en + vehicleSystemBonuses.enbonus;
        this.basecharacteristics.ag.value = 9 + vehicleSystemBonuses.agbonus;
        this.basecharacteristics.in.value = 0 + vehicleSystemBonuses.inbonus;
        this.basecharacteristics.cl.value = 9 + vehicleSystemBonuses.clbonus;

        this.turnrate = 3 + vehicleSystemBonuses.maneuverability;

        // Resource maximums
        this.hitpts.max = vehTableData.hits + vehicleSystemBonuses.hpbonus;
        this.power.max = (this.basecharacteristics.st.value || 0) +
            (this.basecharacteristics.en.value || 0) +
            (this.basecharacteristics.ag.value || 0) +
            (this.basecharacteristics.in.value || 0) +
            vehicleSystemBonuses.powerbonus;

        // Explosion data
        const exploD8s = 1 + Math.floor(adjustedCost / 5);
        const exploD4s = (adjustedCost % 5) ? 1 : 0;
        this.explosion = exploD8s + "d8" + (exploD4s ? "+1d4" : "");
        this.explosionarea = (2 * Math.floor(vehTableData.profile / 2)) + 1;

        // Get stat data for saves
        const statData = this.parent.getStatData();
        this.basecharacteristics.en.save = statData.en.save;
        this.basecharacteristics.ag.save = statData.ag.save;
        this.handling = statData.ag.save - 10;
        this.basecharacteristics.in.save = statData.in.save;
        this.basecharacteristics.cl.save = statData.cl.save;

        this.hth = statData.st.hth_init;
        this.initiative = statData.cl.hth_init;

        this.spacesLeft = vehTableData.spaces - vehicleSystemBonuses.systemspaces;
        this.total_cp = vehicleSystemBonuses.cpcost;

        // Travel rates
        this.travelrates = {};
        if (this.firstaccel > 0 && this.inchesperhex > 0) {
            const baseRate = this.firstaccel / this.turnrate / this.inchesperhex;
            this.travelrates.accel1 = Math.round(baseRate);
            this.travelrates.accel2 = Math.round(baseRate * 2);
            this.travelrates.speednormalmax = Math.round(baseRate * 4);
            this.travelrates.speedpushedmax = Math.round(baseRate * 8);
            this.travelrates.flightnormalmax = Math.round(baseRate * 16);
            this.travelrates.flightpushedmax = Math.round(baseRate * 32);
        }
    }
}

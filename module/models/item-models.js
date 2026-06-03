/**
 * TypeDataModel definitions for Mighty Protectors Items (v14+)
 *
 * Replaces the legacy template.json Item block.
 * Each class defines the schema for its item type's `system` data.
 */

import { MP } from '../config.js';
import { getCharAblityToHitBonus } from '../utility.js';

const { fields } = foundry.data;

// ─── AbilityDataModel ────────────────────────────────────────────────────────

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description:  new fields.HTMLField({ required: true, blank: true, initial: "" }),
            cpcost:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            ipcost:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            rules:        new fields.HTMLField({ required: true, blank: true, initial: "" }),
            stbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            enbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            agbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            clbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            tohitbonus:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            physdefbonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            mentdefbonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powerbonus:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            hpbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            initbonus:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            luckbonus:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usescharges:  new fields.BooleanField({ required: true, initial: false }),
            charges:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
            chargesused:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
            isgear:       new fields.BooleanField({ required: true, initial: false }),
            multiinit:    new fields.BooleanField({ required: true, initial: false }),
            ipbonus:      new fields.NumberField({ required: true, integer: true, initial: 0 })
        };
    }

    // No prepareDerivedData needed for abilities - all fields are stored
}

// ─── VehicleSystemDataModel ───────────────────────────────────────────────────

export class VehicleSystemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            description:    new fields.HTMLField({ required: true, blank: true, initial: "" }),
            dmg:            new fields.NumberField({ required: true, integer: true, initial: 0 }),
            cost:           new fields.NumberField({ required: true, integer: true, initial: 0 }),
            systemspaces:   new fields.NumberField({ required: true, integer: true, initial: 5 }),
            integral:       new fields.BooleanField({ required: true, initial: false }),
            bulky:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
            delicate:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            open:           new fields.BooleanField({ required: true, initial: false }),
            stbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            enbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            agbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            inbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            clbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            maneuverability: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usescharges:    new fields.BooleanField({ required: true, initial: false }),
            charges:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            chargesused:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            isgear:         new fields.BooleanField({ required: true, initial: false }),
            tohitbonus:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            hpbonus:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powerbonus:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            indpower:       new fields.BooleanField({ required: true, initial: false }),
            powervalue:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            powermax:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            // Derived (set in prepareDerivedData)
            profile:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            hits:           new fields.NumberField({ required: false, nullable: true, initial: null }),
            points:         new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `item.system`
        // `this.parent` IS the item document

        if (this.systemspaces) {
            const vehSysList = MP.VehicleSystemsTable.filter(tableRow => (tableRow.spaces <= this.systemspaces));
            const vehSysData = vehSysList[vehSysList.length - 1];

            let cps = vehSysData.cps;

            if (this.open) {
                const openSysList = MP.VehicleSystemsTable.filter(tableRow => (tableRow.spaces <= this.systemspaces / 4));
                const openSysData = openSysList[openSysList.length - 1];
                cps = openSysData.cps;
            }

            let hitsBonus = 0;
            hitsBonus += this.bulky ? Math.ceil((this.bulky / 2.5) * 4.3) : 0;
            hitsBonus -= this.delicate ? Math.ceil((this.delicate / 2.5) * 4.3) : 0;

            this.profile = vehSysData.profile;
            this.hits = vehSysData.hits + hitsBonus;
            this.points = this.integral ? Math.ceil(cps / 2) : cps;
        }
    }
}

// ─── AttackDataModel ─────────────────────────────────────────────────────────

export class AttackDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            dmgroll:      new fields.StringField({ required: true, initial: "1d4" }),
            dmgtype:      new fields.StringField({ required: true, initial: "DAMAGE.BluntKinetic" }),
            dmgsubtype:   new fields.StringField({ required: true, initial: "" }),
            knockback:    new fields.StringField({ required: true, initial: "Y" }),
            attribute:    new fields.StringField({ required: true, initial: "AG" }),
            powercost:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usecharges:   new fields.BooleanField({ required: true, initial: false }),
            chargesource: new fields.StringField({ required: true, initial: "" }),
            bonusids:     new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
            // Derived (set in prepareDerivedData)
            tohit:        new fields.NumberField({ required: false, nullable: true, initial: null }),
            tohitbonus:   new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `item.system`
        // `this.parent` IS the item document

        const actor = this.parent.actor;
        if (!actor) return;

        const actorData = actor.system;

        // First get save for appropriate stat
        let toHit = 3;
        switch (this.attribute) {
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

        toHit += getCharAblityToHitBonus(actor.items, this.bonusids);
        this.tohit = toHit;
    }
}

// ─── VehicleAttackDataModel ───────────────────────────────────────────────────

export class VehicleAttackDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            dmgroll:          new fields.StringField({ required: true, initial: "1d4" }),
            dmgtype:          new fields.StringField({ required: true, initial: "DAMAGE.BluntKinetic" }),
            dmgsubtype:       new fields.StringField({ required: true, initial: "" }),
            knockback:        new fields.StringField({ required: true, initial: "Y" }),
            powercost:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
            usecharges:       new fields.BooleanField({ required: true, initial: false }),
            chargesource:     new fields.StringField({ required: true, initial: "" }),
            indpowersource:   new fields.StringField({ required: false, nullable: true, initial: null }),
            bonusids:         new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
            // Derived
            tohit:            new fields.NumberField({ required: false, nullable: true, initial: null }),
            tohitbonus:       new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `item.system`
        // `this.parent` IS the item document

        const actor = this.parent.actor;
        if (!actor) return;

        const items = actor.items;
        const bonusids = this.bonusids;
        let totalbonus = 0;

        if (bonusids) {
            for (const item of items) {
                if (item.type === "vehiclesystem" && item.system.tohitbonus && bonusids.includes(item.id)) {
                    totalbonus += item.system.tohitbonus;
                }
            }
        }

        this.tohitbonus = totalbonus;
    }
}

// ─── ProtectionDataModel ─────────────────────────────────────────────────────

export class ProtectionDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            kinetic:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            energy:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
            bio:       new fields.NumberField({ required: true, integer: true, initial: 0 }),
            entropy:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            psychic:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
            other:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
            otherdesc: new fields.StringField({ required: true, initial: "" })
        };
    }

    // No prepareDerivedData needed for protections - all fields are stored
}

// ─── MovementDataModel ────────────────────────────────────────────────────────

export class MovementDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            // Stored
            moverate:        new fields.NumberField({ required: true, integer: true, initial: 10 }),
            moveratetype:    new fields.StringField({ required: true, initial: "constant" }),
            accel:           new fields.NumberField({ required: true, integer: true, initial: 0 }),
            top:             new fields.NumberField({ required: true, integer: true, initial: 0 }),
            moverateformula: new fields.StringField({ required: true, initial: "manual" }),
            // Derived (set in prepareDerivedData)
            calcmoverate:    new fields.NumberField({ required: false, nullable: true, initial: null })
        };
    }

    /** @override */
    prepareDerivedData() {
        // `this` IS `item.system`
        // `this.parent` IS the item document

        const actor = this.parent.actor;

        // If manual entry, just use the stored moverate
        if (this.moverateformula === "manual") {
            this.calcmoverate = this.moverate;
            return;
        }

        // Only calculate if attached to an actor and rate type is constant
        if (!actor || this.moveratetype !== "constant") {
            this.calcmoverate = this.moverate;
            return;
        }

        const actorData = actor.system;
        let rate = 0;

        if (this.moverateformula === "ground") {
            rate = (
                (
                    (actorData.basecharacteristics.st.value +
                     actorData.basecharacteristics.ag.value +
                     actorData.basecharacteristics.en.value)
                    / 3
                ) - 0.5
            );
            rate = Math.round(rate);
        } else if (this.moverateformula === "leaping") {
            if (actorData.weight > 0) {
                rate = actorData.carry / actorData.weight;
                rate = Math.round(rate * 100) / 100;
            }
        }

        this.calcmoverate = rate;
    }
}

// ─── BackgroundDataModel ─────────────────────────────────────────────────────

export class BackgroundDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new fields.HTMLField({ required: true, blank: true, initial: "" })
        };
    }
}

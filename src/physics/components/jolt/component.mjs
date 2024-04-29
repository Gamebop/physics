import { Debug } from "../../debug.mjs";
import { buildAccessors } from "../../util.mjs";

class Component extends pc.EventHandler {

    // Flag, whether the accessors were set on this component.
    _accessorsBuilt = false;

    // Enable / disable component
    _enabled = true;

    // The ComponentSystem used to create this Component.
    _system = null;

    // The Entity that this Component is attached to.
    _entity = null;

    constructor(system, entity) {
        super();

        this._system = system;
        this._entity = entity;

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    get entity() {
        return this._entity;
    }

    get system() {
        return this._system;
    }

    get accessorsBuilt() {
        return this._accessorsBuilt;
    }

    set accessorsBuilt(isSet) {
        this._accessorsBuilt = isSet;
    }
    
    onSetEnabled(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (this.entity.enabled) {
                if (newValue) {
                    this.onEnable();
                } else {
                    this.onDisable();
                }
            }
        }
    }

    onEnable() {}

    onDisable() {
        // TODO

        // const constraints = this._constraints;

        // constraints.forEach((entity2, index) => {
        //     entity2?.body?.constraints.delete(index);
        //     this.system.freeConstraintIndex(index);
        // });
        // constraints.clear();
    }

    // PlayCanvas compatibility
    onPostStateChange() {}
}

export { Component };


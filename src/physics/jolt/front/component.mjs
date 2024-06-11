import { EventHandler } from 'playcanvas';

class Component extends EventHandler {
    _accessorsBuilt = false;

    _enabled = true;

    _system = null;

    _entity = null;

    _order = 0;

    constructor(system, entity) {
        super();

        this._system = system;
        this._entity = entity;

        this.on('set', function (name, oldValue, newValue) {
            this.fire('set_' + name, name, oldValue, newValue);
        });

        this.on('set_enabled', this.onSetEnabled, this);
    }

    /** @private */
    get entity() {
        return this._entity;
    }

    /** @private */
    get system() {
        return this._system;
    }

    /** @private */
    set accessorsBuilt(isSet) {
        this._accessorsBuilt = isSet;
    }

    /** @private */
    get accessorsBuilt() {
        return this._accessorsBuilt;
    }

    /** @private */
    get order() {
        return this._order;
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

    onDisable() {}

    // PlayCanvas compatibility
    onPostStateChange() {}
}

export { Component };

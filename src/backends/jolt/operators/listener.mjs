class Listener {
    constructor(backend) {
        this._listener = null;
        this._charListener = null;

        this._backend = backend;

        this._contactsData = [0];
        this._contactsCache = new Set();

        this._charContactsData = new Map();
    }

    get dirty() {
        return (this._contactsData[0] > 0 || this._charContactsData[0] > 0);
    }

    get charListener() {
        return this._charListener;
    }

    // Contact Events

    onContactValidate(body1, body2, baseOffset, collideShapeResult) {
        return this._backend.Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
    }

    initEvents(config) {
        const Jolt = this._backend.Jolt;

        const listener = new Jolt.ContactListenerJS();
        listener.OnContactValidate = this.onContactValidate.bind(this);
        
        if (config.contactAddedEventsEnabled) {
            listener.OnContactAdded = this.onContactAdded.bind(this);
        } else {
            listener.OnContactAdded = () => {};
        }

        if (config.contactPersistedEventsEnabled) {
            listener.OnContactPersisted = this.onContactPersisted.bind(this);
        } else {
            listener.OnContactPersisted = () => {};
        }

        if (config.contactRemovedEventsEnabled) {
            listener.OnContactRemoved = this.onContactRemoved.bind(this);
        } else {
            listener.OnContactRemoved = () => {};
        }

        this._backend.physicsSystem.SetContactListener(listener);

        this._listener = listener;
    }

    overrideContacts(listenerType, overrides) {
        if (listenerType === 'char' && !this._charListener) {
            this.initCharacterEvents();
        }

        const listener = listenerType === 'contacts' ? this._listener : this._charListener;

        for (const [method, funcStr] of Object.entries(overrides)) {
            listener[method] = eval('(' + funcStr + ')').bind(this);
        }
    }

    onContactPersisted(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        this._wrapAndWrite(b1Pointer, b2Pointer, CONTACT_TYPE_PERSISTED, false);
    }

    onContactRemoved(subShapePairPointer) {
        const backend = this._backend;
        const Jolt = backend.Jolt;

        const subShapePair = Jolt.wrapPointer(subShapePairPointer, Jolt.SubShapeIDPair);
        const bodyLockInterface = backend.physicsSystem.GetBodyLockInterface();

        let body1 = bodyLockInterface.TryGetBody(subShapePair.GetBody1ID());
        let body2 = bodyLockInterface.TryGetBody(subShapePair.GetBody2ID());

        // A body could have been destroyed by the time this closure is called.
        // Check if the body is still valid:
        if (Jolt.getPointer(body1) === 0) {
            body1 = null;
        }
        if (Jolt.getPointer(body2) === 0) {
            body2 = null;
        }

        this._writeContactPair(body1, body2, CONTACT_TYPE_REMOVED, true);
    }

    onContactAdded(b1Pointer, b2Pointer, manifoldPointer, settingsPointer) {
        const Jolt = this._backend.Jolt;
        const data = this._contactsData;
        const { contactPoints, contactPointsAveraged } = this._backend.config;
        const manifold = Jolt.wrapPointer(manifoldPointer, Jolt.ContactManifold);

        const ok = this._wrapAndWrite(b1Pointer, b2Pointer, CONTACT_TYPE_ADDED, true);

        if (!ok) {
            return;
        }

        const n = manifold.mWorldSpaceNormal;
        const d = manifold.mPenetrationDepth;

        data.push(n.GetX(), n.GetY(), n.GetZ(), d);

        if (contactPoints) {
            const jv = Jolt.Vec3.prototype.sZero();
            const offset = manifold.mBaseOffset;
            const points1 = manifold.mRelativeContactPointsOn1;
            const points2 = manifold.mRelativeContactPointsOn2;
            const count1 = points1.size();

            if (contactPointsAveraged) {
                for (let i = 0; i < count1; i++) {
                    jv.Add(points1.at(i));
                }
                jv.Mul(1 / count1);
                jv.Add(offset);
                data.push(jv.GetX(), jv.GetY(), jv.GetZ());
            } else {
                const count2 = points1.size();
                data.push(offset.GetX(), offset.GetY(), offset.GetZ(), count1, count2);
                for (let i = 0; i < count1; i++) {
                    const p = points1.at(i);
                    data.push(p.GetX(), p.GetY(), p.GetZ());
                }
                for (let i = 0; i < count2; i++) {
                    const p = points2.at(i);
                    data.push(p.GetX(), p.GetY(), p.GetZ());
                }
            }
        }
    }

    // Character contact events

    initCharacterEvents() {
        const Jolt = this._backend.Jolt;
        const listener = new Jolt.CharacterContactListenerJS();

        listener.OnAdjustBodyVelocity = () => {};

        listener.OnContactValidate = (character, bodyID2, subShapeID2) => {
            // allow all
            return true;
        };

        listener.OnContactAdded = () => {};

        listener.OnContactSolve = this.onCharContactSolve.bind(this);

        this._charListener = listener;
    }

    onCharContactSolve(character, bodyID2, subShapeID2, cp, cn, cv, contactMaterial, characterVelocity, nv) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;

        character = Jolt.wrapPointer(character, Jolt.CharacterVirtual);

        const index = tracker.getPCID(Jolt.getPointer(character));

        // Ignore contact, if the character was created by user via Jolt API directly.
        if (index == null) {
            return;
        }

        const data = this._charContactsData;
        cp = Jolt.wrapPointer(cp, Jolt.Vec3);
        cn = Jolt.wrapPointer(cn, Jolt.Vec3);
        cv = Jolt.wrapPointer(cv, Jolt.Vec3);
        nv = Jolt.wrapPointer(nv, Jolt.Vec3);        
        
        const bodyLockInterface = backend.physicsSystem.GetBodyLockInterface();

        let body2 = bodyLockInterface.TryGetBody(bodyID2);
        if (Jolt.getPointer(body2) === 0) {
            body2 = null;
        }

        let contacts = data.get(index);
        if (!contacts) {
            contacts = [0];
            data.set(index, contacts);
        }

        contacts[0] = ++contacts[0];

        contacts.push(!!body2);
        if (body2) {
            const index2 = tracker.getPCID(Jolt.getPointer(body2));
            contacts.push(index2);
        } else {
            contacts.push(null);
        }

        // contact position
        contacts.push(cp.GetX());
        contacts.push(cp.GetY());
        contacts.push(cp.GetZ());

        // contact normal
        contacts.push(cn.GetX());
        contacts.push(cn.GetY());
        contacts.push(cn.GetZ());

        // contact velocity
        contacts.push(cv.GetX());
        contacts.push(cv.GetY());
        contacts.push(cv.GetZ());

        // new character velocity
        contacts.push(nv.GetX());
        contacts.push(nv.GetY());
        contacts.push(nv.GetZ());
    }

    initVehicleEvents(constraint) {
        const Jolt = this._backend.Jolt;
        const listener = Jolt.VehicleConstraintCallbacksJS();

        listener.GetCombinedFriction = (wheelIndex, tireFrictionDirection, tireFriction, body2, subShapeID2) => {
            body2 = Jolt.wrapPointer(body2, Jolt.Body);
            return Math.sqrt(tireFriction * body2.GetFriction()); // This is the default calculation
        };
        listener.OnPreStepCallback = () => {};
        listener.OnPostCollideCallback = () => {};
        listener.OnPostStepCallback = () => {};

        listener.SetVehicleConstraint(constraint);

        this._vehicleListener = listener;
    }

    write(cb) {
        this._writeContactEvents(cb);
        this._writeCharacterEvents(cb);
    }

    reset(cb) {
        this._contactsData.length = 0;
        this._contactsData[0] = 0;
        this._contactsCache.clear();
        this._charContactsData.clear();
    }

    destroy() {
        const Jolt = this._backend.Jolt;

        if (this._listener) {
            Jolt.destroy(this._listener);
            this._listener = null;
        }

        if (this._charListener) {
            Jolt.destroy(this._charListener);
            this._charListener = null;
        }
    }

    _writeContactEvents(cb) {
        const data = this._contactsData;
        const contactsCount = data[0];
        
        if (contactsCount === 0) {
            return;
        }
        
        const { contactPoints, contactPointsAveraged } = this._backend.config;

        cb.writeOperator(COMPONENT_SYSTEM_BODY);
        cb.writeCommand(CMD_REPORT_CONTACTS);
        
        cb.write(contactsCount, BUFFER_WRITE_UINT32, false);

        // TODO
        // average points per contact pair, instead of all contacts

        for (let i = 0, k = 1; i < contactsCount; i++) {
            // type
            const type = data[k++];
            cb.write(type, BUFFER_WRITE_UINT8, false);

            // idx1, idx2, can be -1
            const isValidBody1 = data[k++];
            const isValidBody2 = data[k++];
            cb.write(isValidBody1, BUFFER_WRITE_BOOL, false);
            cb.write(isValidBody2, BUFFER_WRITE_BOOL, false);
            if (isValidBody1) {
                cb.write(data[k++], BUFFER_WRITE_UINT32, false);
            }
            if (isValidBody2) {
                cb.write(data[k++], BUFFER_WRITE_UINT32, false);
            }

            if (type === CONTACT_TYPE_ADDED) {
                // normal xyz
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                
                // depth
                cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
    
                cb.write(contactPoints, BUFFER_WRITE_BOOL, false);
                if (contactPoints) {
    
                    cb.write(contactPointsAveraged, BUFFER_WRITE_BOOL, false);
                    if (contactPointsAveraged) {
                        // world point
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                    } else {
                        // offset
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        
                        // count1, count2
                        const count1 = data[k++];
                        const count2 = data[k++];
                        cb.write(count1, BUFFER_WRITE_UINT32, false);
                        cb.write(count2, BUFFER_WRITE_UINT32, false);
    
                        // local points
                        for (let i = 0; i < count1; i++) {
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        }
                        for (let i = 0; i < count2; i++) {
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                            cb.write(data[k++], BUFFER_WRITE_FLOAT32, false);
                        }                    
                    }
                }
            }
        }
    }

    _writeCharacterEvents(cb) {
        const data = this._charContactsData;
        const charsCount = data.size;

        // Skip writing contact events, if there are none
        let skip = true;
        data.forEach(contacts => {
            if (contacts[0] > 0) {
                skip = false;
            }
        });
        if (skip) {
            return;
        }

        cb.writeOperator(COMPONENT_SYSTEM_CHAR);
        cb.writeCommand(CMD_REPORT_CONTACTS);
        cb.write(charsCount, BUFFER_WRITE_UINT32, false);

        data.forEach((contacts, index) => {
            const contactsCount = contacts[0];

            cb.write(index, BUFFER_WRITE_UINT32, false);
            cb.write(contactsCount, BUFFER_WRITE_UINT32, false);

            for (let i = 0, k = 1; i < contactsCount; i++) {
                // is body 2 valid
                cb.write(contacts[k++], BUFFER_WRITE_BOOL, false);
                cb.write(contacts[k++] || 0, BUFFER_WRITE_UINT32, false);
                
                // contact position
                // contact normal
                // contact velocity
                // new char velocity
                for (let n = 0; n < 12; n++) {
                    cb.write(contacts[k++], BUFFER_WRITE_FLOAT32, false);
                }
            }
        });
    }

    _wrapAndWrite(b1Pointer, b2Pointer, type, ignoreCache) {
        const Jolt = this._backend.Jolt;
        const Body = Jolt.Body;

        const body1 = Jolt.wrapPointer(b1Pointer, Body);
		const body2 = Jolt.wrapPointer(b2Pointer, Body);

        return this._writeContactPair(body1, body2, type, ignoreCache);
    }

    _writeContactPair(body1, body2, type, ignoreCache) {
        const backend = this._backend;
        const data = this._contactsData;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;

        let idx1 = null;
        if (body1 !== null) {
            idx1 = tracker.getPCID(Jolt.getPointer(body1)) ?? null;
        }

        let idx2 = null;
        if (body2 !== null) {
            idx2 = tracker.getPCID(Jolt.getPointer(body2)) ?? null;
        }

        // Ignore user-created bodies using Jolt API directly.
        if (idx1 == null || idx2 === null) {
            return false;
        }

        // Persisted contacts will be called once per substep, which may 
        // happen multiple times per sim step. For general purposes, the first
        // substep results should be enough, so we can discard the same
        // contact pair after the first substep.
        if (!ignoreCache && body1 && body2) {
            const cache = this._contactsCache;
            const str = `${ idx1 }:${ idx2 }:${ type }`;
            if (cache.has(str)) {
                return;
            }
            cache.add(str);
        }

        data[0] = ++data[0];

        data.push(type);
        data.push(!!body1);
        data.push(!!body2);

        if (body1) {
            data.push(idx1);
        }
        
        if (body2) {
            data.push(idx2);
        }

        return true;
    }
}

export { Listener };
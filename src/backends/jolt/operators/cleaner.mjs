import { Debug } from "../../../physics/debug.mjs";

class Cleaner {
    constructor(backend) {
        this._backend = backend;
    }

    clean() {
        const cb = this._backend.inBuffer;
        const command = cb.readCommand();
        let ok = true;

        switch (command) {
            case CMD_DESTROY_BODY:
                ok = this._destroyBody(cb);
                break;

            case CMD_DESTROY_SHAPE:
                ok = this._destroyShape(cb);
                break;
        }

        return ok;
    }

    destroy() {
        this._backend = null;
    }

    _destroyBody(cb) {
        const index = cb.read(BUFFER_READ_UINT32);
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const bodyInterface = backend.bodyInterface;
        const physicsSystem = backend.physicsSystem;

        const body = tracker.getBodyByPCID(index);

        if (!body) {
            // Body could have been destroyed already. For example:
            // Disable parent, then manually disable child. The body
            // would get destroyed when parent was disabled. The
            // command for destroy would be issued again, when child is
            // disabled.
            return true;
        }

        if (body.debugDrawData) {
            Jolt.destroy(body.triContext);
            body.triContext = null;
            body.debugDrawData = null;
        }

        tracker.stopTrackingBody(body);

        if (body.motionState) {
            body.motionState = null;
        }

        const constraints = body.constraints;
        if (constraints) {
            const constraintMap = tracker.constraintMap;
            for (let i = 0, end = constraints.length; i < end; i++) {
                const index = constraints[i];
                const data = constraintMap.get(index);
                const constraint = data.constraint;
                const listener = constraint.listener; // vehicle
                
                constraintMap.delete(index);
                if (listener && Jolt.getPointer(listener) !== 0) {
                    physicsSystem.RemoveStepListener(listener);
                    Jolt.destroy(listener);
                    constraint.listener = null;
                }
                if (Jolt.getPointer(constraint) !== 0) {
                    physicsSystem.RemoveConstraint(constraint);
                }
            }
            body.constraints = null;

            body.linked?.forEach(linkedBody => {
                if (Jolt.getPointer(linkedBody) !== 0) {
                    bodyInterface.ActivateBody(linkedBody.GetID());
                }
                linkedBody.linked.delete(body);
            });
            body.linked = null;
        }

        if (body.isCharacter) {
            if (body.bodyFilter) {
                Jolt.destroy(body.bodyFilter);
            }

            Jolt.destroy(body);
        } else {
            const id = body.GetID();
            bodyInterface.RemoveBody(id);
            bodyInterface.DestroyBody(id);
        }

        return true;
    }

    _destroyShape(cb) {
        const backend = this._backend;
        const Jolt = backend.Jolt;
        const tracker = backend.tracker;
        const shapeNumber = cb.read(BUFFER_READ_UINT32);
        const shape = tracker.shapeMap.get(shapeNumber);

        if (Debug.dev && !shape) {
            Debug.warn('Trying to destroy a shape that has already been destroyed');
            return false;
        }

        Jolt.destroy(shape);

        tracker.shapeMap.delete(shapeNumber);

        return true;
    }
}

export { Cleaner };
import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';

class ControlsSwitcher extends THREE.EventDispatcher {
    constructor(view, streetControl, options = {}) {
        super();
        this.isSwitchControls = true;
        this.STATES = {
            IMMERSIVE: 0,
            GLOBE: 1,
        };

        this.state = this.STATES.GLOBE;

        this.camera = view.camera.camera3D;
        this.view = view;
        this.options = options;

        this.globeControls = view.controls;
        this.globeControls.enabled = true;

        this.streetControls = streetControl;
        this.streetControls.enabled = false;

        // Tween is used to make smooth animations
        this.tweenGroup = new TWEEN.Group();
    }

    switchMode() {
        if (this.state == this.STATES.IMMERSIVE) {
            this.globeControls.enabled = true;
            this.streetControls.enabled = false;
            this.state = this.STATES.GLOBE;

            this.globeControls.lookAtCoordinate({
                tilt: 89.5,
                zoom: 14,
            }, true);
        } else if (this.state == this.STATES.GLOBE) {
            this.globeControls.enabled = false;

            this.moveCameraTo(this.streetControls.currentPosition, 1000, () => {
                this.streetControls.enabled = true;
                this.streetControls.setCameraToCurrentPosition();
            });

            this.state = this.STATES.IMMERSIVE;
        }
    }

    stopAnimations() {
        if (this.tween) {
            this.tween.stop();
            this.tween = undefined;
        }
        if (this.animationFrameRequester) {
            this.view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
            this.animationFrameRequester = null;
        }
    }

    /**
     * COPIED CODE FROM STREET CONTROL (TODO: REFACTOR)
     * Move the camera smoothly to the position, in a given time.
     *
     * @param { THREE.Vector3 }  position - Destination of the movement.
     * @param { number } time - Time in millisecond
     * @param { function } customOnComplete - callback
     */
    moveCameraTo(position, time, customOnComplete) {
        if (!position) {
            return;
        }

        this.stopAnimations();

        this.tween = new TWEEN.Tween(this.camera.position, this.tweenGroup) // Create a new tween that modifies camera position
            .to(position.clone(), time)
            .easing(TWEEN.Easing.Quadratic.Out) // Use an easing function to make the animation smooth.
            .onComplete(() => {
                this.view.removeFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
                this.animationFrameRequester = null;
                customOnComplete();
            })
            .start();

        this.animationFrameRequester = () => {
            this.tweenGroup.update();

            this.view.notifyChange(this.camera);
        };

        this.view.addFrameRequester(MAIN_LOOP_EVENTS.BEFORE_RENDER, this.animationFrameRequester);
        this.view.notifyChange(this.camera);
    }
}

export default ControlsSwitcher;

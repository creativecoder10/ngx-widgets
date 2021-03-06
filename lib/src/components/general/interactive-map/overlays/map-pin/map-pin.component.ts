
import { Component } from '@angular/core';
import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';

import { OverlayContentComponent } from '../../../../overlays/overlay-content.component';
import { MapService } from '../../../../../services/map.service';

@Component({
    selector: 'map-pin',
    templateUrl: './map-pin.template.html',
    styleUrls: ['./map-pin.styles.scss'],
    animations: [
        trigger('show', [
            transition(':enter', [
                style({ transform: 'translate(-50%, -100%)', opacity: 0 }),
                animate(300, style({ transform: 'translate(-50%, 0%)', opacity: 1 })),
            ]),
            transition(':leave', [style({ opacity: 1 }), animate(300, style({ opacity: 0 }))]),
        ]),
    ],
})
export class MapPinComponent extends OverlayContentComponent<MapService> {
    public static className() { return 'MapPinComponent'; }
    public className() { return MapPinComponent.className; }
}

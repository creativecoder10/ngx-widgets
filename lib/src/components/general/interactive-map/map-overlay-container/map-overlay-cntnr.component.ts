import { Component, Input, Output, EventEmitter, ComponentFactoryResolver, SimpleChanges, ChangeDetectorRef, Injector } from '@angular/core';

import { OverlayContainerComponent } from '../../../overlays/overlay-container/overlay-container.component';

import { IMapPointOfInterest } from '../map.component';
import { MapUtilities } from '../map.utilities';
import { WIDGETS } from '../../../../settings';
import { MapService } from '../../../../services/map.service';

@Component({
    selector: 'map-overlay-container',
    template: `
        <div #el class="overlay-container" (window:resize)="updateItems()">
            <div><ng-container #content></ng-container></div>
        </div>
    `, styles: [`
        .overlay-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            pointer-events: none;
        }
        .overlay-container > div {
            pointer-events: auto;
        }
    `]
})
export class MapOverlayContainerComponent extends OverlayContainerComponent {
    @Input() items: IMapPointOfInterest[];
    @Input() map: SVGElement;
    @Input() container: HTMLDivElement;
    @Input() scale: number;
    @Output() event = new EventEmitter();

    protected map_service: MapService;

    private model: { [name: string]: any } = {};

    constructor(protected _cfr: ComponentFactoryResolver, protected _cdr: ChangeDetectorRef, protected injector: Injector) {
        super(_cfr, _cdr, injector);
        this.id = `map-container-${Math.floor(Math.random() * 8999999 + 1000000)}`;
    }

    public ngOnInit() {
        super.ngOnInit();
        this.map_service = this.injector ? this.injector.get(MapService) : null;
        if (this.service) {
            this.service.registerContainer(this.id, this);
        }
    }

    public ngOnChanges(changes: SimpleChanges) {
        super.ngOnChanges(changes);
        if (changes.items || changes.map) {
            this.clearItems(!!changes.map);
            this.timeout('update', () => this.updateItems(), changes.map && !changes.map.previousValue ? 1000 : 200);
        }
        if (changes.scale) {
            this.update();
        }
    }

    public update() {
        for (const item of (this.model.items || [])) {
            if (item.instance) {
                if (!item.model) { item.model = item.data || {}; }
                item.model.scale = this.scale;
                item.instance.set(item.model);
            }
        }
    }

    /**
     * Render new overlay items on the container
     */
    public updateItems() {
        if (!this.map || !this.container) {
            return this.timeout('update', () => this.updateItems());
        }
        for (const item of (this.items || [])) {
            if (!item.exists) {
                this.add(item.id, item.cmp).then((inst: any) => {
                    const box = this.container.getBoundingClientRect();
                    if (!item.model) { item.model = item.data || {}; }
                    const el = item.id ? this.map.querySelector(MapUtilities.cleanCssSelector(`#${item.id}`)) : null;
                    if (el || item.coordinates) {
                        item.model.center = MapUtilities.getPosition(box, el, item.coordinates) || { x: .5, y: .5 };
                        item.instance = inst;
                        item.model.scale = this.scale;
                        inst.service = this.service ? this.service.getService() || item.service : item.service;
                        inst.set(item.model);
                        inst.fn = {
                            event: (e) => this.event.emit({ id: item.id, type: 'overlay', item, details: event }),
                            close: () => {
                                this.event.emit({ id: item.id, type: 'overlay', item, details: { type: 'close' } });
                                this.remove(item.id);
                            }
                        };
                        if (inst.init instanceof Function) { inst.init(); }
                    } else {
                        this.map_service.log('Warn', `Unable to find element with ID '${item.id}'`);
                    }
                }, (e) => WIDGETS.log('MAP][OVERLAY', e, null, 'warn'));
            } else {
                const box = this.map.getBoundingClientRect();
                const el = this.map.querySelector(MapUtilities.cleanCssSelector(`#${item.id}`));
                if (!item.model) { item.model = item.data || {}; }
                item.model.center = MapUtilities.getPosition(box, el, item.coordinates) || { x: .5, y: .5 };
                if (item.instance) { item.instance.set(item.model); }
            }
        }
        this.model.items = this.items;
    }

    /**
     * Remove overlay items that don't exist anymore
     */
    public clearItems(force: boolean = false) {
        for (const item of (this.model.items || [])) {
            let found = false;
            if (item.instance && !force){
                for (const new_itm of this.items) {
                    if (item.id === new_itm.id && item.cmp === new_itm.cmp) {
                        new_itm.exists = true;
                        new_itm.instance = item.instance;
                        if (!new_itm.model) { new_itm.model = new_itm.data || {}; }
                        new_itm.model.scale = this.scale;
                        if (new_itm.instance) { new_itm.instance.set(new_itm.model); }
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                this.remove(item.id);
            }
        }
    }
}

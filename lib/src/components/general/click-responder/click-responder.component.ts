/**
 * @Author: Alex Sorafumo <Yuion>
 * @Date:   15/09/2016 12:32 PM
 * @Email:  alex@yuion.net
 * @Filename: btn.component.ts
 * @Last modified by:   Alex Sorafumo
 * @Last modified time: 07/02/2017 11:51 AM
 */

import { Component, ElementRef, HostListener } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';

import { BaseWidgetComponent } from '../../../shared/base.component';

export interface IPosition {
    x: number;
    y: number;
    scale?: number;
}

@Component({
    selector: '[click-responder]',
    styleUrls: ['./click-responder.styles.scss'/* , '../../material-styles/material-styles.scss' */],
    templateUrl: './click-responder.template.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('show', [
            transition(':enter', animate('.6s ease-out', keyframes([
                style({ transform: 'translate(-50%, -50%) scale(0)', opacity: 1, offset: 0 }),
                style({ transform: 'translate(-50%, -50%) scale(1)', opacity: 0, offset: 1 })
            ])))
        ])
    ]
})
export class ClickResponderComponent extends BaseWidgetComponent {

    public model: any = {};

    constructor(private el: ElementRef, protected _cdr: ChangeDetectorRef) {
        super();
    }

    @HostListener('touchrelease', ['$event'])
    public onclick(e: any) {
        if (!this.el || !this.el.nativeElement) { return; }
        const box = this.el.nativeElement.getBoundingClientRect();
        const position: IPosition = {
            x: box.width / 2,
            y: box.height / 2,
            scale: Math.max(box.width, box.height)
        };
        const center = e.center ? e.center : { x: e.clientX, y: e.clientY };
        position.x = center.x - box.left;
        position.y = center.y - box.top;
        this.animate(position);
    }

    private animate(position: IPosition) {
        this.model.position = position;
        this.model.show = false;
        this._cdr.markForCheck();
        this.clearTimer('animate')
        this.timeout('show', () => this.show(), 10);
    }

    private show() {
        this.model.show = true;
        this._cdr.markForCheck();
        this.timeout('animate', () => {
            this.model.show = false;
            this._cdr.markForCheck();
        }, 600);
    }
}

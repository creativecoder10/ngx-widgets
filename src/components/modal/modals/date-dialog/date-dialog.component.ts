import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core'; 
import { trigger, transition, animate, style, state, keyframes } from '@angular/core';
import { ModalService } from '../../modal.service';
import { Modal } from '../../modal.component';

const PLACEHOLDER = '-';

@Component({
    selector: '[date-dialog]', 
    styles: [ require('./date-dialog.styles.scss'), require('../../../global-styles/global-styles.scss') ],
    templateUrl: './date-dialog.template.html',
    animations: [
        trigger('backdrop', [
            state('hide',   style({'opacity' : '0'})),
            state('show', style({'opacity' : '1' })),
            transition('* => hide', animate('0.5s ease-out', keyframes([
                style({'bac' : '1', offset: 0}), style({'opacity' : '0', offset: 1.0})
            ]))),
            transition('* => show', animate('0.5s ease-in', keyframes([
                style({'opacity' : '0', offset: 0}), style({'opacity' : '1', offset: 1.0})
            ])))
        ]),
        trigger('space', [
            state('hide',   style({ 'left': '100%', 'opacity' : '0'})),
            state('show', style({ 'left':   '50%', 'opacity' : '1' })),
            transition('* => hide', animate('0.5s ease-out', keyframes([
                style({'left': '50%', 'opacity' : '1', offset: 0}), style({'left': '100%', 'opacity' : '0', offset: 1.0})
            ]))),
            transition('* => show', animate('0.5s ease-in', keyframes([
                style({'left': '100%', 'opacity' : '0', offset: 0}), style({'left': '50%', 'opacity' : '1', offset: 1.0})
            ])))
        ])
    ]
})
export class DateDialog extends Modal {
    @Input() date: Date = null;
    @Input() minDate: Date = null;
    @Input() futureOnly: boolean = false;
    @Input() display: string;
    @Input() color: string = 'teal';
    @Input() primary: string = 'C500';
    @Output() dateChange = new EventEmitter();
	confirm: any = { text: 'OK', fn: null };
	cancel:  any = { text: 'CANCEL', fn: null };

    months_long = ['Janurary', 'Feburary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months_short = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    days_long = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    days_short = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    @ViewChild('content') content: ElementRef;

    setParams(data: any) {
    	super.setParams(data);
    	this.close = true;
    	if(data && data.options){
    		for(let i = 0; i < data.options; i++) {
    			let option = data.options[i];
    			if(option.type === 'confirm') {
    				this.confirm = option;
    			} else if(option.type === 'cancel') {
    				this.cancel = option;
    			}
    		}
    	}
    }
}
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { trigger, transition, animate, style, state, keyframes } from '@angular/core';

@Component({
    selector: 'fancy-toggle',
    directives: [ ],
    templateUrl: './toggle.html',
    styles: [
        require('./toggle.scss')
    ],
    animations: [
        trigger('toggleBg', [
            state('on', style({ 'background-color': '#23CE6B' })),
            state('off', style({ 'background-color': '#F64740' })),
            transition('* => off', animate('100ms ease-out', keyframes([
                style({'background-color': '#23CE6B', offset: 0}), style({'background-color': '#F64740', offset: 1.0})
            ]))),
            transition('* => on', animate('100ms ease-out', keyframes([
                style({'background-color': '#F64740', offset: 0}), style({'background-color': '#23CE6B', offset: 1.0})
            ])))
        ]),
        trigger('textToggle', [
            state('on', style({left: '50%'})),
            state('off', style({left: '0%'})),
            transition("* => off", animate('100ms ease-out', keyframes([
                style({left: '50%', offset: 0}), style({left: '0%', offset: 1.0})
            ]))),
            transition("* => on", animate('100ms ease-out', keyframes([
                style({left: '0%', offset: 0}), style({left: '50%', offset: 1.0})
            ])))
        ]),
        trigger('iosToggle', [
            state('on', style({left: '33%'})),
            state('off', style({left: '2.5%'})),
            transition('* => off', animate('100ms ease-out', keyframes([
                style({left: '33%', offset: 0}), style({left: '2.5%', offset: 1.0})
            ]))),
            transition('* => on', animate('100ms ease-out', keyframes([
                style({left: '2.5%', offset: 0}), style({left: '33%', offset: 1.0})
            ])))
        ])
    ]
})
export class FancyToggle {
    @Input() type;
    @Input() state: boolean = true;
    @Input() active: string;
    @Input() inactive: string;
    @Input() shape: string;
    @Input() colors: { active: string, inactive: string, bg: string };
    @Output() stateChange = new EventEmitter();
    //*
        //Toggle Knob
    @ViewChild('iosToggle')  sknob:any;
    @ViewChild('textToggle') tknob:any;

    toggle: ElementRef;
    tstate: string;

    constructor(){
        this.tstate = this.state ? 'on' : 'off';
    }

    ngInit(){
    }

    ngAfterContentInit(){
        this.initElements();
        this.updateValue(true);
    }

    ngOnChanges(changes: any){
        this.initElements();
        if(changes.state) this.tstate = this.state ? 'on' : 'off';
    }

    initElements(){
        this.toggle = this.type === 'text' ? this.tknob : this.sknob;
            //Setup Interactive Events
        //*
    }

    changeState(event){
        this.state = !this.state;
        this.stateChange.emit(this.state);
    }

    updateValue(update: boolean = false){

    }
}

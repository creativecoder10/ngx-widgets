import { Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import { ComponentRef, ViewContainerRef, ComponentFactoryResolver }  from '@angular/core';
import { AfterViewInit, OnInit, OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { trigger, transition, animate, style, state, keyframes } 	 from '@angular/core';
import { RuntimeCompiler }                                       	 from "@angular/compiler";
import * as _ from 'lodash';

import { IHaveDynamicData, DynamicTypeBuilder } from '../dynamic/type.builder';

const PLACEHOLDER = '-';

@Component({
    selector: '[modal]', 
    styles: [ require('./modal.style.scss'), require('../global-styles/global-styles.scss') ],
    templateUrl: './modal.template.html',
    animations: [
        trigger('backdrop', [
            state('hide',   style({'opacity' : '0'})),
            state('show', style({'opacity' : '1' })),
            transition('* => hide', animate('0.5s ease-out')),
            transition('* => show', animate('0.5s ease-in'))
        ]),
        trigger('space', [
            state('hide',   style({ 'left': '100%', 'opacity' : '0'})),
            state('show', style({ 'left':   '50%', 'opacity' : '1' })),
            transition('* => hide', animate('0.5s ease-out')),
            transition('* => show', animate('0.5s ease-in'))
        ])
    ]
})
export class Modal implements OnInit {
    @Input() private src: string;
    @Input() private htmlContent: string;
    @Input() title: string = 'Modal Title';
    @Input() size: string;
    @Input() data: any;
    @Input() cssClass: any;
    @Input() close: boolean = true;
    @Input() styles: string[] = [];
    @Input() options: Object[] = [
        { text: 'Ok', fn: null },
        { text: 'Cancel', fn: null }
    ];
    @Input() color1: string = ''; // Background Color
    @Input() color2: string = ''; // Foreground Color

    @Output() dataChange = new EventEmitter();
    @Output('open') openEvent = new EventEmitter();
    @Output('close') closeEvent = new EventEmitter();
    @ViewChild('modal') protected modal: ElementRef;
    @ViewChild('content', { read: ViewContainerRef }) protected _content: ViewContainerRef;

    id: string;
    modal_box: any;
    state: string = 'show';
    cb_fn: Function = null;
    error: boolean = false;
    err_msg: string = '';
    content_instance: any = null;
    contentRef: ComponentRef<any> = null;
    clean_fn: Function = null;
    cmp: any;
    width: number = 20;
    unit: string = 'em';
    html: string = '';
    component: any = null;

    constructor(
    	private _cfr: ComponentFactoryResolver,
        protected typeBuilder: DynamicTypeBuilder,
        protected compiler: RuntimeCompiler
    ) {
        this.id = (Math.round(Math.random() * 899999999 + 100000000)).toString();
    }

    ngOnInit() {
    	this.buildContents();
    }

    ngAfterViewInit(){
        if(this.modal) {
            this.modal_box = this.modal.nativeElement.getBoundingClientRect();
        }
    }

    ngOnDestroy(){
      if (this.contentRef) {
          this.contentRef.destroy();
          this.contentRef = null;
      }
    }

    protected buildContents() {
    	if(this.html && this.html !== '') {
    		let template = this.typeBuilder.createComponentAndModule(this.html);
    		this.renderTemplate(template);
    	} else if(this.component){
    		let factory = this._cfr.resolveComponentFactory(this.component);
    		this.render(factory);
    	}
    }

    protected renderTemplate(result: { type: any, module: any }) {
      	let componentType = result.type;
      	let runtimeModule = result.module

      	// Compile module
      	this.compiler
        	.compileModuleAndAllComponentsAsync(runtimeModule)
        	.then((moduleWithFactories) => {
            	let factory = _.find(moduleWithFactories.componentFactories, { componentType: componentType });
            	// Target will instantiate and inject component (we'll keep reference to it)
            	this.render(factory);
        	});
    }

    protected render(factory: any) {
    	if(this.contentRef) {
    		this.contentRef.destroy();
    	}
    	this.contentRef = this._content.createComponent(factory);

        // let's inject @Inputs to component instance
        this.content_instance = this.contentRef.instance; 
        this.content_instance.entity = this.data;
    }

    protected onPointer(event) {
  		if (event.stopPropagation) event.stopPropagation();
		else event.cancelBubble = true;
        if(!this.close || !this.modal) return;
        let c = {
            x: event.clientX,
            y: event.clientY
        }
        if(!this.modal_box) {
            this.modal_box = this.modal.nativeElement.getBoundingClientRect();
        }
        let box = this.modal_box;
        if(c.x < 10 && c.y < 10) this.open();
        if(c.x < box.left || c.y < box.top || c.x > box.left + box.width || c.y > box.top + box.height) {
            console.log('Click outside modal.');
            this.close_fn();
        }
    }

    protected setData(data: any) {
        this.data = data;
    }

    protected setParams(data: any) {
        if(data) {
	    	this.data = data;
	    	if(this.content_instance) this.content_instance.entity = this.data;
            if(data.title) this.title = data.title;
            if(data.html) this.html = data.html;
            if(data.component) this.component = data.component;
            if(data.size) this.size = data.size;
            if(data.options) this.options = data.options;
            if(data.styles) this.styles = data.styles;
            if(data.close !== undefined && data.close !== null) this.close = data.close;
            if(data.width !== undefined && data.width !== null) this.width = data.width;
            if(data.unit !== undefined && data.unit !== null) this.unit = data.unit;
            if(data.colors) {
                this.color1 = data.colors.bg;
                this.color2 = data.colors.fg;
            }
        	this.buildContents();
        }
    }

    protected setCallback(cb_fn: Function) {
        if(cb_fn) {
            this.cb_fn = cb_fn;
        }
    }

    protected close_fn(cb_fn?: Function) {
        console.log('Closing Modal.');
        this.state = 'hide';
        setTimeout(() => { 
            if(cb_fn) cb_fn();
            if(this.clean_fn) this.clean_fn();
            this.closeEvent.emit(null); 
        }, 500);
    }

    protected open() {
        this.state = 'show';
        setTimeout(() => { this.openEvent.emit(null); }, 500);
    }

    set cleanup(clean: Function) {
        this.clean_fn = clean;
    }

    public select(btn: {text:string, fn:Function}) {
        if(this.content_instance) this.data = this.content_instance.data;
        this.dataChange.emit(this.data);
        let fn = (ok, err) => { 
            if(!err) this.close_fn(); 
            else {
                this.error = true;
                this.err_msg = err;
            }
        }
        if(btn.fn) {
            btn.fn(this.data, fn);
        } else if(this.cb_fn !== null) {
            this.cb_fn(this.data, fn);
        } else {
            this.close_fn();
        }
    }
}
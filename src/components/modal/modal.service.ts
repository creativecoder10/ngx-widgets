import { Injectable, ComponentFactoryResolver, ComponentRef, ReflectiveInjector, ViewContainerRef, ResolvedReflectiveProvider, Type } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { Modal } from './modal.component';
import { AlertDialog, ConfirmDialog, DateDialog, TimeDialog } from './modals';

const Modals = {
	default: Modal,
	alert: AlertDialog,
	confirm: ConfirmDialog,
	date: DateDialog,
	time: TimeDialog
}

@Injectable()
export class ModalService {

  	public defaultVC: ViewContainerRef = null;
  	modal: any = {};
  	modalRef: any = {};
  	colors: { fg: string, bg: string } = {
  		fg: '#FFF',
  		bg: '#123456'
  	};
  	bindings : any[] = [];
  	modal_data: any = {};
  	modal_inputs: any = {};
  	last_modal_id: string = '';
  	private vc: ViewContainerRef = null;

	constructor(private _cr: ComponentFactoryResolver, private app:ApplicationRef) {
	}

	ngOnInit() {

	}

	set view(view: ViewContainerRef) {
		this.vc = view;
	}

	setup(id:string, input:any) {
		this.modal_inputs[id] = input;
	}

	open(id:string, input?:any) {
		if(!id || id === '') id = Math.floor(Math.random() * 89999999 + 10000000).toString();
		if(!input) {
				// Check if previous modal data exists
			let info = this.modal_inputs[id];
			if(info && (info.src || info.html)) {
				if(this.modal[id]) this.cleanModal(id);
				this.modal_data[id] = info;
					// Create Modal
				let bindings = ReflectiveInjector.resolve(this.modal_data[id].bindings);
				let model = this.render(id, this.modal_data[id].type, this.vc ? this.vc : this.defaultVC, bindings);
				this.last_modal_id = id;
				return id;
			} else  {
				console.error('No inputs for modal.');
				return id;
			}
		} else if(!input.src && !input.html) {
			if(!this.modal_inputs[id] || (!this.modal_inputs[id].src && !this.modal_inputs[id].html)) {
				console.error('No contents for modal.');
				return id;
			}
		}
		if(this.modal[id]) this.cleanModal(id);
			// Get any previously set properties
		if(this.modal_inputs[id]) this.modal_data[id] = this.modal_inputs[id];
		else this.modal_data[id] = {};
			//Update parameters
		this.modal_data[id] = {
			src : input.src ? input.src : this.modal_data[id].src, // Template location
			type: Modals[input.type] ? Modals[input.type] : (this.modal_data[id].type ? this.modal_data[id].type : Modals.default),
			title: input.title ? input.title : this.modal_data[id].title, 
			data: input.data ? input.data : this.modal_data[id].data,
			html: input.html ? input.html : this.modal_data[id].html,
			text: input.text ? input.text : this.modal_data[id].text,
			size: input.size ? input.size : this.modal_data[id].size,
			styles: input.styles ? input.styles : this.modal_data[id].styles,
			options: input.options ? input.options : this.modal_data[id].options,
			close: input.close ? input.close : this.modal_data[id].close,
			colors : input.colors ? input.colors : (this.modal_data[id].colors ? this.modal_data[id].colors : this.colors),
			bindings : input.bindings ? input.bindings : (this.modal_data[id].bindings ? this.modal_data[id].bindings : this.bindings),
			directives : input.directives ? input.directives : (this.modal_data[id].directives ? this.modal_data[id].directives : [])
		}
		this.modal_inputs[id] = this.modal_data[id];
			// Create Modal
		let bindings = ReflectiveInjector.resolve(this.modal_inputs[id].bindings);
		let model = this.render(id, this.modal_inputs[id].type, this.vc ? this.vc : this.defaultVC, bindings);
		this.last_modal_id = id;
		return id;
	}

	close(id:string) {
		if(id === '' && this.last_modal_id === '') {
				// Close all modals
			let keys = Object.keys(this.modal);
			for(let i = 0; i < keys.length; i++) {
				if(this.modal[keys[i]]) {
					this.modal[id].close_fn();
				}
			}
		} else if(id === '' && this.last_modal_id !== '') {
				//Close last modals
			this.modal[id].close_fn();
			this.last_modal_id = '';
		} else if(id && this.modal[id]) {
				//Close selected modal
			this.modal[id].close_fn();
		}
	}

	clear() {
		let keys = Object.keys(this.modal);
		for(let i = 0; i < keys.length; i++) {
			this.modal[keys[i]].close_fn();
		}
	}

	private cleanModal(id:string) {
		if(this.modalRef[id]) {
				// Remove Modal from DOM
			document.body.removeChild(this.modalRef[id].location.nativeElement);
				// Destory Modal
			this.modalRef[id].destroy();
		}
		this.modalRef[id] = null;
		this.modal[id] = null;
		this.modal_data[id] = null;
	}

    private render(id:string, type: Type<any>, viewContainer: ViewContainerRef, bindings: ResolvedReflectiveProvider[]){
    	if(viewContainer) {
	        let cmpFactory = this._cr.resolveComponentFactory(type)
            const ctxInjector = viewContainer.parentInjector;
            const childInjector = Array.isArray(bindings) && bindings.length > 0 ?
                ReflectiveInjector.fromResolvedProviders(bindings, ctxInjector) : ctxInjector;
            let cmpRef = viewContainer.createComponent(cmpFactory, viewContainer.length, childInjector);
            document.body.appendChild(cmpRef.location.nativeElement);
        	this.modal[id] = cmpRef.instance;
        	this.modalRef[id] = cmpRef;
        	this.modal[id].setParams(this.modal_data[id]);
        	this.modal[id].cleanup = () => { this.cleanModal(id); };
        	return this.modal[id];
        }
    }

}